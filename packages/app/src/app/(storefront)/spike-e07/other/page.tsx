import Link from "next/link";
import { Suspense } from "react";
import { SessionPanel } from "../session-panel";

export default function SpikeOtherPage() {
  return (
    <main>
      <h1>E07 spike other</h1>
      <Suspense fallback={<p>other: loading</p>}>
        <SessionPanel where="other" />
      </Suspense>
      <Link href="/spike-e07" prefetch={true}>
        Spike home
      </Link>
    </main>
  );
}
