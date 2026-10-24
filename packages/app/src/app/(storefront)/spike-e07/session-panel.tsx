// SPIKE (E07 i): a request-time component that reads both sessions. Never inside `use cache`.
import { headers } from "next/headers";
import { getAuth, getCustomerAuth } from "@/server/container";

export async function SessionPanel({ where }: { where: string }) {
  const requestHeaders = await headers();
  const [customer, owner] = await Promise.all([
    getCustomerAuth().api.getSession({ headers: requestHeaders }),
    getAuth().api.getSession({ headers: requestHeaders }),
  ]);
  return (
    <p data-panel={where}>
      {`${where}: customer=${customer?.user.email ?? "none"} owner=${owner?.user.email ?? "none"}`}
    </p>
  );
}
