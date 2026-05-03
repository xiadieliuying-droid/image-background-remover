import { NextResponse, NextRequest } from 'next/server';

interface AuthPayload {
  sub: string;
  email: string;
  name: string;
  userId: number;
  iat: number;
  exp: number;
}

async function verifyJWT(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    const key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      await key,
      Buffer.from(signature, 'base64url'),
      new TextEncoder().encode(signatureInput)
    );
    
    if (!isValid) return null;
    
    const payload: AuthPayload = JSON.parse(atob(encodedPayload));
    
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  if (!token) {
    return NextResponse.json({ loggedIn: false });
  }

  const payload = await verifyJWT(token, jwtSecret);
  
  if (!payload) {
    return NextResponse.json({ loggedIn: false });
  }

  // Get user's subscription info
  const env = (globalThis as any).__cf_env__ || process.env;
  // @ts-ignore - Cloudflare Workers binding
  const d1 = env.DB as D1Database;

  if (!d1) {
    return NextResponse.json({
      loggedIn: true,
      user: { email: payload.email, name: payload.name },
      subscription: null,
    });
  }

  const subscription = await d1
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY id DESC LIMIT 1')
    .bind(payload.userId, 'active')
    .first();

  return NextResponse.json({
    loggedIn: true,
    user: { email: payload.email, name: payload.name, id: payload.userId },
    subscription: subscription || null,
  });
}
