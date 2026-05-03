import { NextResponse, NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const d1 = (env as Record<string, unknown>).DB;

    if (!d1) {
      return NextResponse.json({ error: 'db_not_configured', env_keys: Object.keys(env) }, { status: 500 });
    }

    // Try to create a test user
    const result = await d1
      .prepare('INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)')
      .bind('test-' + Date.now() + '@test.com', 'Test User', 'test-google-id-' + Date.now())
      .run();

    // Try to read it back
    const user = await d1
      .prepare('SELECT * FROM users WHERE google_id LIKE ?')
      .bind('test-google-id-%')
      .first();

    return NextResponse.json({
      success: true,
      insert_result: result,
      user_found: user,
      env_keys: Object.keys(env),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      error_type: err instanceof Error ? err.constructor.name : typeof err,
    }, { status: 500 });
  }
}