/**
 * A fixed-window counter (cart spec A15): each call counts one request against `key` in the
 * current window of `windowSeconds`. `allowed` is false once the count exceeds `limit`.
 */
export interface RateLimiterPort {
  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }>;
}
