import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, PLANS } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billingCycle, locale } = await request.json();

    if (plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = billingCycle === 'yearly'
      ? PLANS.pro.yearlyPriceId
      : PLANS.pro.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const safeLocale = locale === 'zh' ? 'zh' : 'en';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/${safeLocale}/dashboard?payment=success`,
      cancel_url: `${appUrl}/${safeLocale}/pricing?canceled=true`,
      metadata: { userId, plan, billingCycle },
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
