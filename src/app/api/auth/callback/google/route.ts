import { NextResponse, NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

async function createJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signatureInput));
  return `${signatureInput}.${Buffer.from(sig).toString('base64url')}`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/?error=auth_failed`);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID!;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const redirectUri = `${url.origin}/api/auth/callback/google`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    // Log tokens info (not the actual tokens)
    console.log('[DEBUG] token response status:', tokenRes.status);
    console.log('[DEBUG] token response ok:', tokenRes.ok);
    const tokensText = await tokenRes.text();
    console.log('[DEBUG] token response body:', tokensText.slice(0, 200));
    let tokens: GoogleTokenResponse;
    try {
      tokens = JSON.parse(tokensText);
    } catch {
      throw new Error(`token_parse_error: ${tokensText.slice(0, 100)}`);
    }

    // Get user info
    console.log('[DEBUG] about to fetch userinfo with access_token');
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfoRaw = await userInfoRes.text();
    console.log('[DEBUG] userinfo response:', userInfoRaw.slice(0, 200));
    let userInfo: GoogleUserInfo;
    try {
      userInfo = JSON.parse(userInfoRaw);
    } catch {
      throw new Error(`userinfo_parse_error: ${userInfoRaw.slice(0, 100)}`);
    }
    console.log('[DEBUG] parsed userInfo:', JSON.stringify(userInfo));

    // Use D1 to find or create user
    const { env } = await getCloudflareContext({ async: true });
    console.log('[DEBUG] getCloudflareContext env keys:', Object.keys(env));
    console.log('[DEBUG] DB binding:', (env as Record<string, unknown>).DB ? 'exists' : 'missing');
    console.log('[DEBUG] userInfo from Google:', JSON.stringify(userInfo));
    console.log('[DEBUG] userInfo.sub:', userInfo.sub, 'type:', typeof userInfo.sub);
    console.log('[DEBUG] userInfo keys:', Object.keys(userInfo));
    // @ts-ignore - DB binding not in CloudflareEnv types
    const d1: any = (env as Record<string, unknown>).DB;
    
    if (!d1) {
      return NextResponse.redirect(`${url.origin}/?error=db_not_configured`);
    }

    // Use sub (not id) - Google OAuth2 v3 userinfo returns 'sub' field
    if (typeof userInfo.sub !== 'string' || userInfo.sub.length === 0) {
      throw new Error(`userInfo.sub is invalid! type=${typeof userInfo.sub} value=${JSON.stringify(userInfo.sub)} userInfo=${JSON.stringify(userInfo)}`);
    }

    let user: Record<string, unknown> | null = null;
    
    try {
      // Check if user exists
      const googleId: string = userInfo.sub;
      console.log('[DEBUG] binding googleId:', JSON.stringify(googleId), 'len:', googleId.length, 'bytes:', Buffer.byteLength(googleId, 'utf8'));
      
      // Pre-flight: try a simple query first to verify d1 works
      const testQuery = await d1.prepare('SELECT 1 as test').first();
      console.log('[DEBUG] test query result:', testQuery);
      
      const userResult = await d1
        .prepare('SELECT id, email, name, google_id FROM users WHERE google_id = ?')
        .bind(googleId)
        .first();
      user = userResult as Record<string, unknown> | null;
      console.log('[DEBUG] user query result:', user);
    } catch (err) {
      console.error('[DEBUG] Error checking user:', err);
      console.error('[DEBUG] googleId type:', typeof userInfo.sub, 'json:', JSON.stringify(userInfo.sub), 'len:', userInfo.sub?.length);
      console.error('[DEBUG] Buffer of googleId:', Buffer.from(String(userInfo.sub), 'utf8').toString('hex'));
      throw new Error(`user_query_error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!user) {
      // Create new user
      const result = await d1
        .prepare('INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)')
        .bind(userInfo.email, userInfo.name, userInfo.sub)
        .run();
      
      user = { 
        id: result.meta?.last_row_id, 
        email: userInfo.email, 
        name: userInfo.name, 
        google_id: userInfo.sub,
        created_at: Math.floor(Date.now() / 1000),
        last_login: Math.floor(Date.now() / 1000)
      };

      // Give 10 free credits to new users
      await d1
        .prepare('INSERT INTO subscriptions (user_id, plan, status, credits) VALUES (?, ?, ?, ?)')
        .bind(user.id, 'free', 'active', 10)
        .run();

      // Log the gift
      await d1
        .prepare('INSERT INTO usage_logs (user_id, email, action, credits_used) VALUES (?, ?, ?, ?)')
        .bind(user.id, userInfo.email, 'gift', 10)
        .run();
    } else {
      // Update last login
      await d1
        .prepare('UPDATE users SET last_login = ? WHERE id = ?')
        .bind(Math.floor(Date.now() / 1000), user.id)
        .run();
    }

    // Create JWT token
    const token = await createJWT(
      {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        userId: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
      jwtSecret
    );

    // Set cookie and redirect
    const response = NextResponse.redirect(`${url.origin}/?logged_in=1`);
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Error details:', errMsg);
    // @ts-ignore
    return NextResponse.redirect(`${url.origin}/?error=auth_failed&detail=${encodeURIComponent(errMsg)}`);
  }
}
