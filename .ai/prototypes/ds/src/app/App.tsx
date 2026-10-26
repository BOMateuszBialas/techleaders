import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CartDrawer, CartProvider, initialLines, useCartState } from "./cart";
import { galleryScreen } from "./screens/gallery";
import { ownerScreens } from "./screens/owner";
import { shopperScreens } from "./screens/shopper";
import type { ScreenDef } from "./shared";

const screens: ScreenDef[] = [...shopperScreens, ...ownerScreens, galleryScreen];

/** Screens of the key flow that are not built in this prototype (see README, "Not covered"). */
const NOT_BUILT: Record<string, string> = {
  s08: "Order lookup (guest)",
  s09: "Customer sign-up",
  s10: "Customer sign-in",
};

const WIDTHS = ["320", "390", "768", "1440", "full"] as const;
type Width = (typeof WIDTHS)[number];

function currentId(): string {
  return window.location.hash.replace(/^#/, "") || "s01";
}

function useHash(): string {
  const [hash, setHash] = useState(currentId);
  useEffect(() => {
    const onChange = () => setHash(currentId());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [width, setWidth] = useState<Width>("1440");
  const [stateByScreen, setStateByScreen] = useState<Record<string, string>>({});
  const frameRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<boolean | null>(null);
  const cart = useCartState();
  const { preset, setOpen } = cart;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const screen = screens.find((s) => s.id === hash);
  const notBuilt = NOT_BUILT[hash];
  const active = screen ?? screens[0];
  const state = stateByScreen[active.id] ?? active.states[0];
  // Layout A is the only layout of s01 and s18 (owner decision, 2026-10-26); the picker is gone.
  const layout = "A";

  // A screen change closes the cart drawer; the drawer states open it with a preset cart.
  useEffect(() => {
    setOpen(false);
    if (state === "cart-open") preset(initialLines, true);
    if (state === "cart-empty") preset([], true);
  }, [active.id, state, preset, setOpen]);

  // Review aid: does the simulated width make the page scroll sideways? (Q7: 320 px is the contract.)
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    setOverflow(el.scrollWidth > el.clientWidth + 1);
  });

  const groups = ["Shopper", "Owner", "Prototype"] as const;

  return (
    <CartProvider value={cart}>
    <div className="min-h-dvh bg-background text-foreground">
      <CartDrawer />
      <div className="sticky top-0 z-40 border-b border-border bg-popover px-gutter py-related">
        <div className="flex flex-wrap items-end gap-group-item">
          <Field className="w-auto min-w-44">
            <FieldLabel htmlFor="rb-screen">Screen</FieldLabel>
            <NativeSelect
              id="rb-screen"
              value={active.id}
              onChange={(e) => (window.location.hash = e.target.value)}
            >
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {screens
                    .filter((s) => s.group === g)
                    .map((s) => (
                      <NativeSelectOption key={s.id} value={s.id}>
                        {s.id === "components" ? s.title : `${s.id} ${s.title}`}
                      </NativeSelectOption>
                    ))}
                </optgroup>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-auto min-w-40">
            <FieldLabel htmlFor="rb-state">State</FieldLabel>
            <NativeSelect
              id="rb-state"
              value={state}
              onChange={(e) => setStateByScreen({ ...stateByScreen, [active.id]: e.target.value })}
            >
              {active.states.map((s) => (
                <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-auto min-w-28">
            <FieldLabel htmlFor="rb-width">Width</FieldLabel>
            <NativeSelect id="rb-width" value={width} onChange={(e) => setWidth(e.target.value as Width)}>
              {WIDTHS.map((w) => (
                <NativeSelectOption key={w} value={w}>{w === "full" ? "Full" : `${w} px`}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button
            variant="outline"
            size="default"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </Button>
        </div>
        <p className="mt-related type-small text-muted-foreground" role="status">
          Prototype review bar, not part of the design system. Simulated data only.
          {overflow === null ? null : overflow ? " Sideways scroll: yes." : " Sideways scroll: no."}
        </p>
      </div>

      <div className="flex justify-center p-gutter">
        <div
          ref={frameRef}
          data-testid="screen-frame"
          style={{ width: width === "full" ? "100%" : `${width}px`, maxWidth: "100%" }}
          className="min-h-96 overflow-x-auto rounded-card border border-border bg-background"
        >
          {notBuilt ? (
            <div className="p-panel">
              <h1 className="font-heading type-h2">{notBuilt}</h1>
              <p className="mt-related type-body text-muted-foreground">
                Not built in this prototype (outside the key-flow screens in the map). See the README.
              </p>
            </div>
          ) : (
            <div key={active.id}>{active.render({ state, layout })}</div>
          )}
        </div>
      </div>
    </div>
    </CartProvider>
  );
}
