export interface Env {
  REMOVE_BG_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const formData = await request.formData();
      const image = formData.get('image');

      if (!image || !(image instanceof File)) {
        return Response.json({ error: 'No image provided' }, { status: 400 });
      }

      const buffer = await image.arrayBuffer();

      const removeBgForm = new FormData();
      removeBgForm.append('image_file', new File([buffer], image.name, { type: image.type }));
      removeBgForm.append('size', 'auto');
      removeBgForm.append('format', 'png');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': env.REMOVE_BG_API_KEY,
        },
        body: removeBgForm,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Response.json(
          { error: `Remove.bg API error: ${errorText}` },
          { status: response.status }
        );
      }

      const resultBuffer = await response.arrayBuffer();
      return new Response(resultBuffer, {
        headers: { 'Content-Type': 'image/png' },
      });
    } catch (err) {
      console.error('Worker error:', err);
      return Response.json({ error: 'Failed to process image' }, { status: 500 });
    }
  },
};