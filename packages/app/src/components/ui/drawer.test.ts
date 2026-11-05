import { describe, expect, it } from "vitest";
import { drawerPopupClassFor } from "./drawer";

describe("drawerPopupClassFor", () => {
  it("opens the sheet from the right by default and from the left on request", () => {
    expect(drawerPopupClassFor("right")).toContain("right-0");
    expect(drawerPopupClassFor("right")).toContain("data-starting-style:translate-x-full");
    expect(drawerPopupClassFor("left")).toContain("left-0");
    expect(drawerPopupClassFor("left")).toContain("border-r");
    expect(drawerPopupClassFor("left")).toContain("data-starting-style:-translate-x-full");
  });
});
