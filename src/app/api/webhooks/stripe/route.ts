import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        let currentPeriodEnd: string | null = null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        if (userId && plan) {
          const { error } = await supabase.from('subscriptions').upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId ?? null,
              stripe_subscription_id: subscriptionId ?? null,
              plan,
              status: 'active',
              current_period_end: currentPeriodEnd,
            },
            { onConflict: 'user_id' }
          );

          if (error) {
            throw new Error(`Failed to upsert subscription: ${error.message}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          throw new Error(`Failed to update subscription: ${error.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
