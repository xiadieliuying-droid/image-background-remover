import { NextResponse, NextRequest } from 'next/server';

// PayPal API helpers
const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

const SUBSCRIPTION_PLANS = [
  { id: 'starter', name: 'Starter', price: 10.99, credits: 50 },
  { id: 'professional', name: 'Professional', price: 44.99, credits: 200 },
  { id: 'business', name: 'Business', price: 109.99, credits: 500 },
];

// Create subscription
export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 });
    }

    const token = await getPayPalAccessToken(clientId, clientSecret);

    const subscriptionPayload = {
      plan_id: `IMG_BG_${plan.id.toUpperCase()}_MONTHLY`,
      application_context: {
        return_url: `${new URL(request.url).origin}/api/paypal/success?type=subscription&plan=${planId}`,
        cancel_url: `${new URL(request.url).origin}/?paypal_cancelled=1`,
      },
    };

    const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const subscription = await res.json();

    if (!res.ok) {
      console.error('[PayPal] Subscription creation failed:', subscription);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    const approvalLink = subscription.links?.find((l: any) => l.rel === 'approve');
    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl: approvalLink?.href,
    });
  } catch (err) {
    console.error('[PayPal] Create subscription error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Get available plans
export async function GET() {
  return NextResponse.json({
    plans: SUBSCRIPTION_PLANS.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      credits: p.credits,
    })),
  });
}