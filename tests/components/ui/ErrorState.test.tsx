import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "@/components/ui/ErrorState";

describe("ErrorState", () => {
  it("renders the message", () => {
    render(<ErrorState message="Couldn't load the homepage." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the homepage.");
  });

  it("fires onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState message="Failed" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders no retry button when onRetry is not provided", () => {
    render(<ErrorState message="Failed" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
