import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';
import JSZip from 'jszip';

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

interface ProcessResult {
  fileName: string;
  success: boolean;
  data?: Buffer;
  error?: string;
}

async function processImage(buffer: Buffer, apiKey: string, fileName: string): Promise<ProcessResult> {
  try {
    const formData = new FormData();
    formData.append('image_file', new Blob([buffer]), fileName);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: { 'X-Api-Key': apiKey },
      responseType: 'arraybuffer',
    });

    return { success: true, data: Buffer.from(response.data), fileName };
  } catch (err) {
    const msg = axios.isAxiosError(err) ? (err.response?.data as string)?.toString() : 'Failed';
    return { success: false, error: String(msg), fileName };
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'login_required', message: '请先登录' }, { status: 401 });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token', message: '登录已过期，请重新登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Process all images concurrently with rate limiting
    const MAX_CONCURRENT = 3;
    const results: ProcessResult[] = [];
    
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      const batch = files.slice(i, i + MAX_CONCURRENT);
      const buffers = await Promise.all(batch.map(f => f.arrayBuffer()));
      
      const batchResults = await Promise.all(
        batch.map((f, idx) => processImage(Buffer.from(buffers[idx]), apiKey, f.name))
      );
      
      results.push(...batchResults);
    }

    // Create zip with only successful results
    const zip = new JSZip();
    
    for (const result of results) {
      if (result.success && result.data) {
        const cleanName = result.fileName.replace(/\.[^.]+$/, '');
        zip.file(`${cleanName}-rmbg.png`, result.data);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return new Response(zipBlob, {
      headers: { 
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="processed-images-${Date.now()}.zip"`,
        'X-Results': JSON.stringify({ total: results.length, success: successCount, failed: failCount }),
      },
    });
  } catch (error) {
    console.error('Batch remove error:', error);
    return NextResponse.json({ error: 'Batch processing failed' }, { status: 500 });
  }
}