import { NextResponse, NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context';

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

async function paypalFetch(url: string, options: RequestInit, token: string) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'credits_single', name: 'Single', credits: 1, price: 0.99 },
  { id: 'credits_10', name: '10 Credits', credits: 10, price: 4.99 },
  { id: 'credits_100', name: '100 Credits', credits: 100, price: 27.99 },
  { id: 'credits_500', name: '500 Credits', credits: 500, price: 139.99 },
  { id: 'credits_1000', name: '1000 Credits', credits: 1000, price: 279.99 },
];

// Create a one-time order for credits
export async function POST(request: NextRequest) {
  try {
    const { packageId } = await request.json();

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 });
    }

    const token = await getPayPalAccessToken(clientId, clientSecret);

    // Create order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        description: pkg.name,
        amount: {
          currency_code: 'USD',
          value: pkg.price.toFixed(2),
        },
        custom_id: packageId,
      }],
      application_context: {
        return_url: `${new URL(request.url).origin}/api/paypal/success?type=order&package=${packageId}`,
        cancel_url: `${new URL(request.url).origin}/?paypal_cancelled=1`,
      },
    };

    const res = await paypalFetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    }, token);

    const order = await res.json();

    if (!res.ok) {
      console.error('[PayPal] Order creation failed:', order);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Find approval URL
    const approvalLink = order.links?.find((l: any) => l.rel === 'approve');
    return NextResponse.json({ orderId: order.id, approvalUrl: approvalLink?.href });
  } catch (err) {
    console.error('[PayPal] Create order error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}