import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback/google`;
  
  const scopes = encodeURIComponent('email profile openid');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  
  return NextResponse.redirect(authUrl);
}
