import DodoPayments from 'dodopayments';

let client: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!client) {
    client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment:
        process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
          ? 'live_mode'
          : 'test_mode',
    });
  }
  return client;
}

export type ProPlan = 'monthly' | 'yearly';

export function getProductIdForPlan(plan: ProPlan): string | undefined {
  return plan === 'yearly'
    ? process.env.DODO_PRODUCT_YEARLY
    : process.env.DODO_PRODUCT_MONTHLY;
}

export function getPlanForProductId(
  productId: string | null | undefined
): ProPlan | null {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_MONTHLY) return 'monthly';
  if (productId === process.env.DODO_PRODUCT_YEARLY) return 'yearly';
  return null;
}
