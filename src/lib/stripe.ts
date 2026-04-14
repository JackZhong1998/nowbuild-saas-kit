import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY || '';

export const stripe = key
  ? new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true })
  : (null as unknown as Stripe);

export const PLANS = {
  free: {
    name: 'Free',
    monthlyPriceId: null,
    yearlyPriceId: null,
  },
  pro: {
    name: 'Pro',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ?? '',
  },
} as const;
