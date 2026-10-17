import "server-only";
import type { Money, PaymentGateway } from "@commerceos/core";

/**
 * The only payment adapter (cart spec A9, A13; decisions D03, R03): a **demo** that charges
 * nothing, contacts no provider and receives no card data. It cannot fail. Its reference is
 * deterministic (`DEMO-PAY-<order id>`), so two concurrent confirmations of one order agree and
 * only one conditional update marks it paid. `isLive: false` is what the UI states.
 */
export class DemoPaymentGateway implements PaymentGateway {
  readonly provider = "demo" as const;
  readonly isLive = false as const;

  async authorize(request: {
    idempotencyKey: string;
    amount: Money;
  }): Promise<{ providerReference: string }> {
    return { providerReference: `DEMO-PAY-${request.idempotencyKey}` };
  }
}
