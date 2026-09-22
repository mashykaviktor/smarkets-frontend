import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/app/providers";
import LoginPage from "@/app/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginPage", () => {
  it("links to the real Smarkets signup page, not a custom form", () => {
    render(
      <Providers>
        <LoginPage />
      </Providers>,
    );

    const signupLink = screen.getByRole("link", { name: "Create one" });
    expect(signupLink).toHaveAttribute("href", "https://smarkets.com/members/signup/");
  });
});
