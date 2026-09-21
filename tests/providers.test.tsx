import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("renders children inside the QueryClientProvider", () => {
    render(
      <Providers>
        <p>ready</p>
      </Providers>,
    );

    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
