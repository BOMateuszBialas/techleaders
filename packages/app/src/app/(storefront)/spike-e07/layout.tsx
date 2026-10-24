import { Suspense } from "react";
import { SessionPanel } from "./session-panel";

export default function SpikeLayout({ children }: LayoutProps<"/spike-e07">) {
  return (
    <div className="p-4">
      <Suspense fallback={<p>layout: loading</p>}>
        <SessionPanel where="layout" />
      </Suspense>
      {children}
    </div>
  );
}
