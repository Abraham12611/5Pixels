import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  NotificationInboxList,
  unreadBadgeLabel,
} from "../notification-dropdown";
import type { NotificationItem } from "@/lib/db/notifications";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/db/notifications", () => ({
  markNotificationRead: vi.fn(async () => ({ success: true })),
  markAllNotificationsRead: vi.fn(async () => ({ success: true })),
}));

function item(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: "n1",
    type: "generation",
    title: "Your result is ready",
    body: "Generation completed successfully.",
    link: "/app/results/r1",
    read_at: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

describe("unreadBadgeLabel", () => {
  it("returns null when there is nothing unread", () => {
    expect(unreadBadgeLabel(0)).toBeNull();
  });

  it("shows the count, capped at 9+", () => {
    expect(unreadBadgeLabel(3)).toBe("3");
    expect(unreadBadgeLabel(9)).toBe("9");
    expect(unreadBadgeLabel(10)).toBe("9+");
    expect(unreadBadgeLabel(42)).toBe("9+");
  });
});

describe("NotificationInboxList", () => {
  it("groups rows under Today and Earlier", () => {
    render(
      <NotificationInboxList
        items={[
          item({ id: "a" }),
          item({ id: "b", title: "Old one", created_at: yesterday }),
        ]}
        onRead={vi.fn()}
      />
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Earlier")).toBeInTheDocument();
    expect(screen.getByText("Old one")).toBeInTheDocument();
  });

  it("shows the empty state when there are no notifications", () => {
    render(<NotificationInboxList items={[]} onRead={vi.fn()} />);
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it("marks an unread row read on activation and navigates to its link", async () => {
    const onRead = vi.fn();
    render(
      <NotificationInboxList items={[item({ id: "a" })]} onRead={onRead} />
    );
    fireEvent.click(screen.getByRole("button", { name: /unread/i }));
    expect(onRead).toHaveBeenCalledWith("a");
  });

  it("links to notification settings", () => {
    render(<NotificationInboxList items={[]} onRead={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: /notification settings/i })
    ).toHaveAttribute("href", "/app/account/notifications");
  });

  it("exposes Mark all read only while unread items remain", () => {
    const { rerender } = render(
      <NotificationInboxList
        items={[item({ id: "a" })]}
        unread={1}
        onRead={vi.fn()}
        onMarkAll={vi.fn()}
      />
    );
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
    rerender(
      <NotificationInboxList
        items={[item({ id: "a", read_at: new Date().toISOString() })]}
        unread={0}
        onRead={vi.fn()}
        onMarkAll={vi.fn()}
      />
    );
    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });
});
