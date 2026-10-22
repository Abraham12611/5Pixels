import { describe, expect, it } from "vitest";
import { libraryStatusLabel } from "../index";

describe("libraryStatusLabel", () => {
  it("labels terminal states — they are not 'in progress'", () => {
    expect(libraryStatusLabel("completed")).toBe("Result");
    expect(libraryStatusLabel("failed")).toBe("Failed");
    expect(libraryStatusLabel("blocked")).toBe("Blocked");
    expect(libraryStatusLabel("cancelled")).toBe("Cancelled");
  });

  it("labels everything else as in progress", () => {
    expect(libraryStatusLabel("processing")).toBe("In progress");
    expect(libraryStatusLabel("created")).toBe("In progress");
    expect(libraryStatusLabel("")).toBe("In progress");
  });
});
