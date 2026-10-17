import type { Money } from "../domain/money";
import type { PaymentProvider } from "../domain/orders/order";

/**
 * A payment provider (cart spec A9, A13). The only adapter is the demo gateway, which charges
 * nothing; `isLive: false` lets the UI say so (R03, D03). A real gateway must honour
 * `idempotencyKey` (the order id), so two concurrent confirmations cannot charge twice.
 */
export interface PaymentGateway {
  readonly provider: PaymentProvider;
  readonly isLive: false;
  authorize(request: {
    idempotencyKey: string;
    amount: Money;
  }): Promise<{ providerReference: string }>;
}
