import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello({ name }: { name: string }) {
  return <p>Witaj, {name}!</p>;
}

describe("jsdom sanity", () => {
  it("renders a component in jsdom", () => {
    render(<Hello name="świat" />);
    expect(screen.getByText("Witaj, świat!")).toBeInTheDocument();
  });
});
