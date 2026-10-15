import { describe, expect, it } from "vitest";
import { fieldDefault } from "@/lib/action-state";
import { readFormValues } from "./form-data";

describe("readFormValues", () => {
  it("copies only the listed fields, as strings", () => {
    const data = new FormData();
    data.set("name", "Mice");
    data.set("slug", "");
    data.set("role", "owner");
    data.set("upload", new Blob(["x"]), "x.txt");

    expect(readFormValues(data, ["name", "slug", "description", "upload"])).toEqual({
      name: "Mice",
      slug: "",
      description: "",
      upload: "",
    });
  });
});

describe("fieldDefault", () => {
  it("prefers the submitted value after a failed submit", () => {
    const failed = { status: "error", values: { name: "Typed" } } as const;
    expect(fieldDefault(failed, "name", "Stored")).toBe("Typed");
    expect(fieldDefault(failed, "slug", "stored-slug")).toBe("stored-slug");
    expect(fieldDefault({ status: "error" }, "name")).toBe("");
  });

  it("uses the stored value otherwise", () => {
    expect(fieldDefault({ status: "idle" }, "name", "Stored")).toBe("Stored");
    expect(fieldDefault({ status: "success", values: { name: "Old" } }, "name", "New")).toBe("New");
    expect(fieldDefault({ status: "idle" }, "name")).toBe("");
  });
});
