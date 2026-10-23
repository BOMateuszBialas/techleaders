import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const NOT_CONFIGURED =
  "AI drafting is not set up on this store (no AI key). Write the description yourself.";
const DRAFT_BUTTON = 'main button[aria-describedby="description-draft-hint"]';
const DRAFTS_URL = "/api/admin/products/description-drafts";

type ProductRow = { id: string; name: string; description: string };

/**
 * AI product description drafts, Phase 2 (descriptions spec, step 11). The e2e app runs without
 * any AI key, so the "Draft with AI" button is disabled with its explanation, and the route
 * answers `not_configured` without spending any budget. Drafting with a real key is a manual
 * check (README, "AI drafts").
 */
describe("admin product description drafts (no AI key)", () => {
  const browser = useBrowser();
  const pool = new Pool({ connectionString: inject("databaseUrl") });
  let vortex: ProductRow;

  async function vortexRow(): Promise<ProductRow> {
    const { rows } = await pool.query<ProductRow>(
      `select id, name, description
         from products where slug = 'vortex-wireless-mouse'`,
    );
    const [row] = rows;
    if (!row) throw new Error("The seeded Vortex Wireless Mouse is missing");
    return row;
  }

  function postDraft(cookie?: string) {
    return fetch(new URL(DRAFTS_URL, inject("baseUrl")), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({
        name: vortex.name,
        categoryId: "",
        price: "249.00",
        notes: vortex.description,
      }),
    });
  }

  beforeAll(async () => {
    vortex = await vortexRow();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("signed out", () => {
    beforeAll(async () => {
      await browser().clearCookies();
    });

    it("answers 401 to the draft API", async () => {
      const response = await postDraft();
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    });
  });

  describe("signed in", () => {
    beforeAll(async () => {
      await useOwnerSession(browser());
    });

    async function expectDisabledDraftButton() {
      await browser().waitForText(NOT_CONFIGURED);
      expect(await browser().text(DRAFT_BUTTON)).toBe("Draft with AI");
      expect(
        await browser().evaluate(
          `document.querySelector(${JSON.stringify(DRAFT_BUTTON)}).getAttribute("aria-disabled")`,
        ),
      ).toBe("true");
    }

    it("shows a disabled Draft with AI button with the reason on the edit page", async () => {
      await browser().open(`/admin/products/${vortex.id}`);
      await browser().waitForText("Save changes");
      await expectDisabledDraftButton();
    });

    it("shows the same on the new-product page", async () => {
      await browser().open("/admin/products/new");
      await browser().waitForText("Create product");
      await expectDisabledDraftButton();
    });

    it("answers not_configured to a signed-in draft request", async () => {
      const response = await postDraft(inject("ownerSessionCookie"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        data: { kind: "unavailable", reason: "not_configured" },
      });
    });

    it("leaves the description unchanged when the form is saved as it is", async () => {
      await browser().open(`/admin/products/${vortex.id}`);
      await browser().waitForText("Save changes");
      await browser().clickRole("button", "Save changes");
      await browser().waitForText("Saved.");
      expect((await vortexRow()).description).toBe(vortex.description);
    });

    // The draft panel's Undo refuses to overwrite a saved draft by comparing the draft with the
    // textarea's `defaultValue` (#76). This pins that a successful Save re-renders the field
    // with the stored description as its default.
    it("re-renders the Description field with the saved text as its default after Save", async () => {
      const saved = `${vortex.description} Saved by the e2e test.`;
      try {
        await browser().open(`/admin/products/${vortex.id}`);
        await browser().waitForText("Save changes");
        await browser().fillLabel("Description", saved);
        await browser().clickRole("button", "Save changes");
        await browser().waitForText("Saved.");
        expect((await vortexRow()).description).toBe(saved);
        const field = `document.querySelector("#product-description")`;
        expect(await browser().evaluate(`${field}.defaultValue`)).toBe(saved);
        expect(await browser().evaluate(`${field}.value`)).toBe(saved);
      } finally {
        await pool.query("update products set description = $1 where id = $2", [
          vortex.description,
          vortex.id,
        ]);
      }
    });
  });
});
