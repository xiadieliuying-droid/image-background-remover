import { NextResponse, NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context';

// Handle PayPal redirect after payment approval
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const token = url.searchParams.get('token');
  const packageId = url.searchParams.get('package');
  const planId = url.searchParams.get('plan');

  if (!token) {
    return NextResponse.redirect(`${url.origin}/?error=paypal_missing_token`);
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    const d1: any = (env as Record<string, unknown>).DB;

    if (type === 'order' && packageId) {
      // Capture the order and add credits
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      // Get access token
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Capture the order
      const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      const captureData = await captureRes.json();

      if (captureRes.ok && captureData.status === 'COMPLETED') {
        // Get user from cookie
        const authToken = request.cookies.get('auth_token')?.value;
        if (authToken) {
          // Decode JWT to get userId (simplified - in production use proper verification)
          try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const userId = payload.userId;

            if (userId) {
              // Add credits based on package
              const creditAmounts: Record<string, number> = { credits_single: 1, credits_10: 10, credits_100: 100, credits_500: 500, credits_1000: 1000 };
              const credits = creditAmounts[packageId] || 0;

              // Update subscription credits
              await d1.prepare('UPDATE subscriptions SET credits = credits + ? WHERE user_id = ?')
                .bind(credits, userId)
                .run();

              // Log transaction
              await d1.prepare(
                'INSERT INTO usage_logs (user_id, email, action, credits_used, details) VALUES (?, ?, ?, ?, ?)'
              ).bind(userId, payload.email, 'paypal_purchase', credits, `package:${packageId}`)
                .run();
            }
          } catch (e) {
            console.error('[PayPal] JWT decode error:', e);
          }
        }

        return NextResponse.redirect(`${url.origin}/?paypal_success=1&type=order`);
      }
    }

    if (type === 'subscription' && planId) {
      // Activate subscription
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Activate subscription
      await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${token}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      const authToken = request.cookies.get('auth_token')?.value;
      if (authToken) {
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1]));
          const userId = payload.userId;

          if (userId) {
            const planCredits: Record<string, number> = { starter: 50, professional: 200, business: 500 };

            await d1.prepare('UPDATE subscriptions SET plan = ?, credits = ? WHERE user_id = ?')
              .bind(`paypal_${planId}`, planCredits[planId] || 500)
              .bind(userId)
              .run();
          }
        } catch (e) {
          console.error('[PayPal] JWT decode error:', e);
        }
      }

      return NextResponse.redirect(`${url.origin}/?paypal_success=1&type=subscription`);
    }
  } catch (err) {
    console.error('[PayPal] Success handler error:', err);
  }

  return NextResponse.redirect(`${url.origin}/?error=paypal_capture_failed`);
}