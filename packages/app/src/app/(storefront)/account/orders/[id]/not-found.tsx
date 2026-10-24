import { AccountOrderNotFound } from "@/components/account/account-order-not-found";

/** The same answer for a malformed, unknown and foreign order id (E07 spec A11, AC4). */
export default function AccountOrderNotFoundPage() {
  return <AccountOrderNotFound />;
}
