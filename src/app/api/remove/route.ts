import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
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