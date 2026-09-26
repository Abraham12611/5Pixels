import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunsList, type LibraryRun } from "../runs-list";

function run(partial: Partial<LibraryRun>): LibraryRun {
  return {
    id: "r1",
    productName: "Manga Cut-Out",
    productSlug: "manga-cutout",
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
    // Completed + in-progress show the cost; the failed run shows Refunded.
    expect(screen.getAllByText(/credits?$/).length).toBe(2);
    expect(screen.getByText("Refunded")).toBeInTheDocument();
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
    // Failed rows carry the stretched row link + the Try again chip
    expect(links[2]).toHaveAttribute("href", "/app/generations/bad");
  });

  it("groups rows under day headers", () => {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    render(
      <RunsList
        runs={[
          run({ id: "a", createdAt: today.toISOString() }),
          run({ id: "b", createdAt: threeDaysAgo.toISOString() }),
        ]}
      />
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    // The older group falls back to a date label
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("failed runs show Refunded and an inline Try again", () => {
    render(
      <RunsList
        runs={[run({ id: "f1", status: "failed", creditCost: 5 })]}
      />
    );
    expect(screen.getByText("Refunded")).toBeInTheDocument();
    expect(screen.queryByText("5 credits")).not.toBeInTheDocument();
    const retry = screen.getByRole("link", { name: "Try again" });
    expect(retry).toHaveAttribute("href", "/app/create/manga-cutout");
  });

  it("footer reconciles spend and links to billing history", () => {
    render(
      <RunsList
        runs={[
          run({ id: "c1", status: "completed", creditCost: 5 }),
          run({ id: "c2", status: "completed", creditCost: 8 }),
          run({ id: "f1", status: "failed", creditCost: 5 }),
        ]}
      />
    );
    // Only debited (completed) runs count toward spend — the failed run's
    // charge was refunded.
    expect(
      screen.getByText(/13 credits spent on completed runs/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See billing history" })
    ).toHaveAttribute("href", "/app/billing/history");
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
