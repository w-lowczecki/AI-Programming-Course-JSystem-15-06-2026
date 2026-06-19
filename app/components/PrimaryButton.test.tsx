import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrimaryButton } from "./PrimaryButton";

describe("PrimaryButton", () => {
  it("renderuje tekst dzieci", () => {
    render(<PrimaryButton>Kliknij mnie</PrimaryButton>);
    expect(screen.getByText("Kliknij mnie")).toBeInTheDocument();
  });

  it("jest elementem <button>", () => {
    render(<PrimaryButton>Akcja</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Akcja" })).toBeInTheDocument();
  });

  it("ma klasę z zielonym tłem (brand-primary)", () => {
    render(<PrimaryButton>Akcja</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-brand-primary/);
  });

  it("ma klasę z czarnym tekstem (text-on-brand)", () => {
    render(<PrimaryButton>Akcja</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/text-on-brand/);
  });

  it("ma klasę pill (rounded-full)", () => {
    render(<PrimaryButton>Akcja</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/rounded-full/);
  });

  it("wywołuje onClick po kliknięciu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PrimaryButton onClick={onClick}>Akcja</PrimaryButton>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ma focus-visible ring dla dostępności", () => {
    render(<PrimaryButton>Akcja</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/focus-visible:/);
  });
});
