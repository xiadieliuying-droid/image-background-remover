import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';

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
    
    const key = await crypto.subtle.importKey(
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
    
    const payload = JSON.parse(atob(encodedPayload));
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'login_required', message: '请先登录' }, { status: 401 });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'image-background-remover-secret-key';
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token', message: '登录已过期，请重新登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Remove.bg API key not configured' }, { status: 500 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const removeBgForm = new FormData();
    removeBgForm.append('image_file', new Blob([buffer]), image.name);
    removeBgForm.append('size', 'auto');
    removeBgForm.append('format', 'png');

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', removeBgForm, {
      headers: {
        'X-Api-Key': apiKey,
      },
      responseType: 'arraybuffer',
    });

    return new Response(response.data, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error: unknown) {
    console.error('Remove bg error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: 'Remove.bg API error: ' + (error.response.data as string).toString() },
        { status: error.response.status }
      );
    }
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}