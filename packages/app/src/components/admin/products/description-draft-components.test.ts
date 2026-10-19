import type { DescriptionUnavailableReason } from "@commerceos/ai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import {
  createDraftPanelAction,
  descriptionFieldOf,
  draftPanelHandlers,
  formDataOf,
  IDLE_DRAFT_STATE,
  readDraftFields,
  type DraftPanelState,
} from "./description-draft-client";
import {
  APPLIED_TEXT,
  basedOnText,
  DESCRIPTION_DRAFTS_URL,
  DRAFT_HEADING,
  DRAFT_WARNING,
  IDLE_HINT,
  NOT_CONFIGURED_TEXT,
  PENDING_TEXT,
  RATE_LIMITED_TEXT,
  REPLACE_LABEL,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_REASON_TEXT,
  UNAVAILABLE_TEXT,
  UNDO_LABEL,
} from "./description-draft-copy";
import { DescriptionDraftPanel } from "./description-draft-panel";
import {
  DescriptionDraftPanelView,
  type DescriptionDraftPanelViewProps,
} from "./description-draft-panel-view";
import { ProductFormView } from "./product-form-view";

/** The Description field as the browser has it; `instanceof` is checked against this class. */
class FakeTextArea {
  constructor(public value: string) {}
}

type FakeForm = { values: Record<string, string>; elements: { namedItem(name: string): unknown } };

/** A product form with the given values and, unless `textarea` is null, a Description field. */
function fakeForm(values: Record<string, string>, textarea: unknown = new FakeTextArea("old")) {
  const form: FakeForm = {
    values,
    elements: { namedItem: (name) => (name === "description" ? textarea : null) },
  };
  // Test double: the helpers read only `elements.namedItem` and `new FormData(form)`.
  return form as unknown as HTMLFormElement;
}

const RealFormData = FormData;

beforeEach(() => {
  vi.stubGlobal("HTMLTextAreaElement", FakeTextArea);
  // `new FormData(form)` needs a DOM; this one reads the fake form's values.
  vi.stubGlobal(
    "FormData",
    class extends RealFormData {
      constructor(form?: FakeForm) {
        super();
        for (const [name, value] of Object.entries(form?.values ?? {})) this.append(name, value);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(status: number, body: unknown) {
  return vi.fn(async () =>
    typeof body === "string" ? new Response(body, { status }) : Response.json(body, { status }),
  );
}

const FORM_VALUES = {
  name: "Vortex Wireless Mouse",
  categoryId: "c-1",
  price: "249.00",
  description: "[DEMO] 26,000 DPI.",
  sku: "DEMO-MOU-001",
};
const READY: DraftPanelState = {
  kind: "ready",
  text: "[DEMO] A wireless mouse with a 26,000 DPI sensor.",
  fieldsUsed: ["name", "category", "price", "notes"],
};

describe("description draft copy", () => {
  it("names the fields a draft was based on", () => {
    expect(basedOnText(["name", "category", "price", "notes"])).toBe(
      "Based on: name, category, price, your notes",
    );
    expect(basedOnText(["name", "notes"])).toBe("Based on: name, your notes");
  });

  it("has one sentence per reason, and one shared text for provider failures", () => {
    const reasons: DescriptionUnavailableReason[] = [
      "not_configured",
      "insufficient_input",
      "timeout",
      "rate_limited",
      "provider_error",
      "auth",
      "refused",
      "daily_limit",
      "invalid_output",
    ];
    expect(Object.keys(UNAVAILABLE_REASON_TEXT).sort()).toEqual([...reasons].sort());
    for (const reason of ["rate_limited", "provider_error", "auth", "refused"] as const) {
      expect(UNAVAILABLE_REASON_TEXT[reason]).toBe(UNAVAILABLE_TEXT);
    }
    expect(UNAVAILABLE_REASON_TEXT.invalid_output).toContain("not in your product data");
  });
});

describe("description draft client helpers", () => {
  it("reads the four fields from the form data, the description as notes", () => {
    const data = new RealFormData();
    data.append("name", "Mouse");
    data.append("description", "Light.");
    data.append("price", new Blob(["x"]));
    expect(readDraftFields(data)).toEqual({
      name: "Mouse",
      categoryId: "",
      price: "",
      notes: "Light.",
    });
  });

  it("builds the form data from the form itself", () => {
    const form = fakeForm({ name: "Mouse" });
    expect(formDataOf(form).get("name")).toBe("Mouse");
  });

  it("finds the Description textarea, and nothing else", () => {
    const textarea = new FakeTextArea("text");
    expect(descriptionFieldOf(fakeForm({}, textarea))).toBe(textarea);
    expect(descriptionFieldOf(fakeForm({}, { value: "not a textarea" }))).toBeNull();
    expect(descriptionFieldOf(null)).toBeNull();
  });
});

describe("createDraftPanelAction: draft", () => {
  it("posts the form's current values and shows the checked draft", async () => {
    const fetcher = respond(200, {
      ok: true,
      data: {
        kind: "draft",
        text: READY.kind === "ready" ? READY.text : "",
        model: "m",
        promptVersion: "v",
        fieldsUsed: ["name", "category", "price", "notes"],
        demoMarked: true,
      },
    });
    const state = await createDraftPanelAction(fetcher)(IDLE_DRAFT_STATE, {
      type: "draft",
      form: fakeForm(FORM_VALUES),
    });
    expect(state).toEqual(READY);
    expect(fetcher).toHaveBeenCalledWith(DESCRIPTION_DRAFTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vortex Wireless Mouse",
        categoryId: "c-1",
        price: "249.00",
        notes: "[DEMO] 26,000 DPI.",
      }),
    });
  });

  it("does nothing without a form", async () => {
    const fetcher = respond(200, {});
    expect(await createDraftPanelAction(fetcher)(READY, { type: "draft", form: null })).toEqual(
      IDLE_DRAFT_STATE,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [
      200,
      { ok: true, data: { kind: "unavailable", reason: "invalid_output" } },
      UNAVAILABLE_REASON_TEXT.invalid_output,
    ],
    [
      200,
      { ok: true, data: { kind: "unavailable", reason: "not_configured" } },
      NOT_CONFIGURED_TEXT,
    ],
    [
      400,
      {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid.",
          fieldErrors: { name: ["Enter a name."] },
        },
      },
      "Enter a name.",
    ],
    [
      400,
      {
        ok: false,
        error: { code: "VALIDATION_FAILED", message: "The request body must be valid JSON." },
      },
      "The request body must be valid JSON.",
    ],
    [401, { ok: false, error: { code: "UNAUTHORIZED", message: "No." } }, SESSION_ENDED_TEXT],
    [429, { ok: false, error: { code: "RATE_LIMITED", message: "Slow down." } }, RATE_LIMITED_TEXT],
    [
      500,
      { ok: false, error: { code: "INTERNAL", message: "Something went wrong." } },
      UNAVAILABLE_TEXT,
    ],
    [502, "<html>bad gateway</html>", UNAVAILABLE_TEXT],
  ])("shows a message for status %i", async (status, body, message) => {
    const state = await createDraftPanelAction(respond(status, body))(IDLE_DRAFT_STATE, {
      type: "draft",
      form: fakeForm(FORM_VALUES),
    });
    expect(state).toEqual({ kind: "message", message });
  });

  it("shows the generic message when the network fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(
      await createDraftPanelAction(fetcher)(IDLE_DRAFT_STATE, {
        type: "draft",
        form: fakeForm(FORM_VALUES),
      }),
    ).toEqual({ kind: "message", message: UNAVAILABLE_TEXT });
  });
});

describe("createDraftPanelAction: replace, undo, discard", () => {
  const action = createDraftPanelAction(respond(200, {}));

  it("replaces the description with the draft and keeps the old text for Undo", async () => {
    const textarea = new FakeTextArea("My own text");
    const form = fakeForm({}, textarea);
    const applied = await action(READY, { type: "apply", form });
    expect(applied).toEqual({ kind: "applied", previous: "My own text" });
    expect(textarea.value).toBe(READY.kind === "ready" ? READY.text : "");

    expect(await action(applied, { type: "undo", form })).toEqual(IDLE_DRAFT_STATE);
    expect(textarea.value).toBe("My own text");
  });

  it("changes nothing when there is no draft, nothing to undo or no field", async () => {
    const textarea = new FakeTextArea("Mine");
    const applied: DraftPanelState = { kind: "applied", previous: "Before" };
    expect(await action(IDLE_DRAFT_STATE, { type: "apply", form: fakeForm({}, textarea) })).toBe(
      IDLE_DRAFT_STATE,
    );
    expect(await action(READY, { type: "apply", form: fakeForm({}, null) })).toBe(READY);
    expect(await action(READY, { type: "undo", form: fakeForm({}, textarea) })).toBe(READY);
    expect(await action(applied, { type: "undo", form: null })).toBe(applied);
    expect(textarea.value).toBe("Mine");
  });

  it("discards the draft", async () => {
    expect(await action(READY, { type: "discard" })).toEqual(IDLE_DRAFT_STATE);
  });
});

describe("draftPanelHandlers", () => {
  it("dispatches one command per button, with the button's form", () => {
    const dispatch = vi.fn();
    const form = fakeForm({});
    const handlers = draftPanelHandlers(dispatch);
    handlers.onDraft({ currentTarget: { form } });
    handlers.onApply({ currentTarget: { form } });
    handlers.onUndo({ currentTarget: { form } });
    handlers.onDiscard();
    expect(dispatch.mock.calls).toEqual([
      [{ type: "draft", form }],
      [{ type: "apply", form }],
      [{ type: "undo", form }],
      [{ type: "discard" }],
    ]);
  });
});

function renderPanel(props: Partial<DescriptionDraftPanelViewProps> = {}) {
  return renderToStaticMarkup(
    createElement(DescriptionDraftPanelView, {
      available: true,
      state: IDLE_DRAFT_STATE,
      pending: false,
      onDraft: vi.fn(),
      onApply: vi.fn(),
      onUndo: vi.fn(),
      onDiscard: vi.fn(),
      ...props,
    }),
  );
}

describe("DescriptionDraftPanelView", () => {
  it("is disabled with the reason when AI drafting is not configured", () => {
    const html = renderPanel({ available: false });
    expect(html).toContain("Draft with AI");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-describedby="description-draft-hint"');
    expect(html).toContain(NOT_CONFIGURED_TEXT);
    expect(html).not.toContain(IDLE_HINT);
    expect(html).toContain('type="button"');
  });

  it("offers drafting with the hint when idle", () => {
    const html = renderPanel();
    expect(html).toContain(IDLE_HINT);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toMatch(/ disabled=""|aria-disabled/);
    expect(html).toContain('type="button"');
  });

  it("disables the button and says it can take a while while pending", () => {
    const html = renderPanel({ pending: true });
    expect(html).toContain(PENDING_TEXT);
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/ disabled=""/);
  });

  it("shows a ready draft as plain text with its sources, the warning and the actions", () => {
    const html = renderPanel({
      state: { kind: "ready", text: "Line one <b>bold</b>\n\nLine two", fieldsUsed: ["name"] },
    });
    expect(html).toContain(DRAFT_HEADING);
    expect(html).toContain("Line one &lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("whitespace-pre-line");
    expect(html).toContain("Based on: name");
    expect(html).toContain(DRAFT_WARNING);
    expect(html).toContain(REPLACE_LABEL);
    expect(html).toContain("Discard");
  });

  it("offers Undo once the draft is in the Description field", () => {
    const html = renderPanel({ state: { kind: "applied", previous: "x" } });
    expect(html).toContain(APPLIED_TEXT);
    expect(html).toContain(UNDO_LABEL);
    expect(html).not.toContain(REPLACE_LABEL);
  });

  it("shows why no draft is shown", () => {
    const html = renderPanel({ state: { kind: "message", message: RATE_LIMITED_TEXT } });
    expect(html).toContain(RATE_LIMITED_TEXT);
    expect(html).not.toContain(DRAFT_HEADING);
  });
});

describe("DescriptionDraftPanel", () => {
  it("renders the idle view", () => {
    const html = renderToStaticMarkup(createElement(DescriptionDraftPanel, { available: true }));
    expect(html).toContain(IDLE_HINT);
  });
});

describe("ProductFormView description draft slot", () => {
  it("renders the slot right under the Description field", () => {
    const html = renderToStaticMarkup(
      createElement(ProductFormView, {
        action: vi.fn(),
        state: IDLE_ACTION_STATE,
        pending: false,
        categories: [],
        descriptionDraft: createElement("p", { id: "slot" }, "draft panel"),
      }),
    );
    const description = html.indexOf('id="product-description"');
    const slot = html.indexOf('id="slot"');
    const price = html.indexOf('id="product-price"');
    expect(description).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(description);
    expect(slot).toBeLessThan(price);
  });
});
