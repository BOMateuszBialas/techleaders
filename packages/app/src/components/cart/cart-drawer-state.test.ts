import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { ADDED_TO_CART_MESSAGE } from "./cart-copy";
import {
  cartDrawerReducer,
  closeDrawerOnRequest,
  drawerTitle,
  INITIAL_CART_DRAWER_STATE,
  isPlainPrimaryClick,
  openDrawerAfterAdd,
  openDrawerOnPlainClick,
  type CartDrawerAction,
  type DrawerClickEvent,
} from "./cart-drawer-state";

/** A fake DOM element: the drawer only compares and forwards it. */
class FakeHTMLElement {}

function click(overrides: Partial<DrawerClickEvent> = {}): DrawerClickEvent {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: null,
    preventDefault: vi.fn<() => void>(),
    ...overrides,
  };
}

describe("cartDrawerReducer", () => {
  it("opens with the trigger to return focus to, and an optional notice", () => {
    const trigger = new FakeHTMLElement() as unknown as HTMLElement;
    const opened = cartDrawerReducer(INITIAL_CART_DRAWER_STATE, {
      type: "open",
      trigger,
      notice: ADDED_TO_CART_MESSAGE,
    });
    expect(opened.open).toBe(true);
    expect(opened.notice).toBe("Added to cart.");
    expect(opened.returnFocusTo.current).toBe(trigger);
  });

  it("closes and drops the notice but keeps where focus returns", () => {
    const trigger = new FakeHTMLElement() as unknown as HTMLElement;
    const opened = cartDrawerReducer(INITIAL_CART_DRAWER_STATE, {
      type: "open",
      trigger,
      notice: "Added to cart.",
    });
    const closed = cartDrawerReducer(opened, { type: "close" });
    expect(closed).toEqual({ open: false, notice: null, returnFocusTo: opened.returnFocusTo });
  });

  it("starts closed with no focus target", () => {
    expect(INITIAL_CART_DRAWER_STATE).toEqual({
      open: false,
      notice: null,
      returnFocusTo: { current: null },
    });
  });
});

describe("drawerTitle", () => {
  it("names the cart with its item count", () => {
    expect(drawerTitle(0)).toBe("Your cart (0)");
    expect(drawerTitle(3)).toBe("Your cart (3)");
  });
});

describe("isPlainPrimaryClick", () => {
  it("is true for a left click without modifier keys", () => {
    expect(isPlainPrimaryClick(click())).toBe(true);
  });

  it("is false for a middle or right click and for each modifier key", () => {
    expect(isPlainPrimaryClick(click({ button: 1 }))).toBe(false);
    expect(isPlainPrimaryClick(click({ button: 2 }))).toBe(false);
    expect(isPlainPrimaryClick(click({ metaKey: true }))).toBe(false);
    expect(isPlainPrimaryClick(click({ ctrlKey: true }))).toBe(false);
    expect(isPlainPrimaryClick(click({ shiftKey: true }))).toBe(false);
    expect(isPlainPrimaryClick(click({ altKey: true }))).toBe(false);
  });
});

describe("openDrawerOnPlainClick", () => {
  it("prevents the navigation and opens the drawer from the link on a plain click", () => {
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    const trigger = new FakeHTMLElement() as unknown as HTMLElement;
    const event = click({ currentTarget: trigger });
    openDrawerOnPlainClick(dispatch)(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({ type: "open", trigger, notice: null });
  });

  it("leaves a modified click to the browser, so /cart opens in a new tab", () => {
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    const event = click({ ctrlKey: true });
    openDrawerOnPlainClick(dispatch)(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("openDrawerAfterAdd", () => {
  function stubFocus(active: unknown) {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("document", { activeElement: active });
  }

  it("opens the drawer with 'Added to cart.' after a successful add, returning focus to the focused button", async () => {
    const button = new FakeHTMLElement();
    stubFocus(button);
    const success: ActionState = { status: "success", message: "Added to cart." };
    const add = vi.fn(async () => success);
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    const wrapped = openDrawerAfterAdd(add, dispatch);

    const previous = IDLE_ACTION_STATE;
    const formData = new FormData();
    expect(await wrapped(previous, formData)).toBe(success);
    expect(add).toHaveBeenCalledWith(previous, formData);
    expect(dispatch).toHaveBeenCalledWith({
      type: "open",
      trigger: button,
      notice: ADDED_TO_CART_MESSAGE,
    });
    vi.unstubAllGlobals();
  });

  it("returns no focus target when the focus is not on an HTML element", async () => {
    stubFocus(null);
    const add = vi.fn(async (): Promise<ActionState> => ({ status: "success", message: "ok" }));
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    await openDrawerAfterAdd(add, dispatch)(IDLE_ACTION_STATE, new FormData());
    expect(dispatch).toHaveBeenCalledWith({
      type: "open",
      trigger: null,
      notice: ADDED_TO_CART_MESSAGE,
    });
    vi.unstubAllGlobals();
  });

  it("keeps the drawer closed and returns the refused result for a failed add", async () => {
    stubFocus(null);
    const refused: ActionState = { status: "error", message: "Only 3 left in stock." };
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    const result = await openDrawerAfterAdd(async () => refused, dispatch)(
      IDLE_ACTION_STATE,
      new FormData(),
    );
    expect(result).toBe(refused);
    expect(dispatch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("closeDrawerOnRequest", () => {
  it("dispatches close when Base UI asks to close, and ignores an open request", () => {
    const dispatch = vi.fn<(action: CartDrawerAction) => void>();
    const onOpenChange = closeDrawerOnRequest(dispatch);
    onOpenChange(false);
    expect(dispatch).toHaveBeenCalledWith({ type: "close" });
    onOpenChange(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
