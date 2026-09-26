import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunsList, type LibraryRun } from "../runs-list";

function run(partial: Partial<LibraryRun>): LibraryRun {
  return {
    id: "r1",
    productName: "Manga Cut-Out",
    status: "completed",
    creditCost: 5,
    createdAt: new Date().toISOString(),
    thumb: null,
    ...partial,
  };
}

describe("RunsList", () => {
  it("renders preset name, status pill, and credit cost per row", () => {
    render(
      <RunsList
        runs={[
          run({ id: "a", status: "completed", creditCost: 5 }),
          run({ id: "b", productName: "Ink Portrait", status: "failed" }),
          run({ id: "c", productName: "Cover Star", status: "generating" }),
        ]}
      />
    );
    expect(screen.getByText("Manga Cut-Out")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByText(/credits?$/).length).toBeGreaterThanOrEqual(3);
  });

  it("routes completed runs to results and others to the progress page", () => {
    render(
      <RunsList
        runs={[
          run({ id: "done", status: "completed" }),
          run({ id: "wip", status: "generating" }),
          run({ id: "bad", status: "failed" }),
        ]}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/app/results/done");
    expect(links[1]).toHaveAttribute("href", "/app/generations/wip");
    expect(links[2]).toHaveAttribute("href", "/app/generations/bad");
  });

  it("shows an empty state with a browse call to action", () => {
    render(<RunsList runs={[]} />);
    expect(
      screen.getByText("No transformations yet.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse looks" })
    ).toHaveAttribute("href", "/explore");
  });
});
