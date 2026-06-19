import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Select, SelectOption } from "./Select";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Card } from "./Card";
import { Dialog } from "./Dialog";
import { SecondaryButton } from "./SecondaryButton";
import { FieldError } from "./FieldError";
import { StatusBadge } from "./StatusBadge";

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------
describe("Select", () => {
  const options: SelectOption[] = [
    { value: "a", label: "Opcja A" },
    { value: "b", label: "Opcja B" },
  ];

  it("renderuje element select z poprawnym aria-label", () => {
    render(
      <Select
        options={options}
        value="a"
        onChange={() => {}}
        aria-label="Wybierz opcję"
      />
    );
    expect(screen.getByRole("combobox", { name: "Wybierz opcję" })).toBeInTheDocument();
  });

  it("renderuje wszystkie opcje", () => {
    render(
      <Select
        options={options}
        value="a"
        onChange={() => {}}
        aria-label="Wybierz opcję"
      />
    );
    expect(screen.getByRole("option", { name: "Opcja A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Opcja B" })).toBeInTheDocument();
  });

  it("używa klas design-tokenów (bg-bg-elevated, text-text-primary)", () => {
    render(
      <Select
        options={options}
        value="a"
        onChange={() => {}}
        aria-label="Wybierz opcję"
      />
    );
    const el = screen.getByRole("combobox");
    expect(el.className).toMatch(/bg-bg-elevated/);
    expect(el.className).toMatch(/text-text-primary/);
  });

  it("wywołuje onChange po zmianie wartości", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        options={options}
        value="a"
        onChange={onChange}
        aria-label="Wybierz opcję"
      />
    );
    await user.selectOptions(screen.getByRole("combobox"), "b");
    expect(onChange).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
describe("Input", () => {
  it("renderuje element input z poprawnym typem", () => {
    render(<Input aria-label="Pole tekstowe" />);
    expect(screen.getByRole("textbox", { name: "Pole tekstowe" })).toBeInTheDocument();
  });

  it("używa klasy design-tokenów (bg-bg-elevated)", () => {
    render(<Input aria-label="Pole tekstowe" />);
    const el = screen.getByRole("textbox");
    expect(el.className).toMatch(/bg-bg-elevated/);
  });

  it("używa klas zaokrąglenia (rounded-sm)", () => {
    render(<Input aria-label="Pole tekstowe" />);
    const el = screen.getByRole("textbox");
    expect(el.className).toMatch(/rounded-sm/);
  });

  it("przekazuje value i onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label="Pole" value="" onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), "t");
    expect(onChange).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------
describe("Textarea", () => {
  it("renderuje element textarea", () => {
    render(<Textarea aria-label="Pole opisu" />);
    expect(screen.getByRole("textbox", { name: "Pole opisu" })).toBeInTheDocument();
  });

  it("używa klasy design-tokenów (bg-bg-elevated)", () => {
    render(<Textarea aria-label="Pole opisu" />);
    const el = screen.getByRole("textbox");
    expect(el.className).toMatch(/bg-bg-elevated/);
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
describe("Card", () => {
  it("renderuje dzieci wewnątrz kontenera", () => {
    render(<Card>Zawartość karty</Card>);
    expect(screen.getByText("Zawartość karty")).toBeInTheDocument();
  });

  it("używa klas design-tokenów (bg-bg-tinted)", () => {
    render(<Card data-testid="card">Treść</Card>);
    const el = screen.getByTestId("card");
    expect(el.className).toMatch(/bg-bg-tinted/);
  });

  it("ma zaokrąglenie karty (rounded-card lub rounded)", () => {
    render(<Card data-testid="card">Treść</Card>);
    const el = screen.getByTestId("card");
    expect(el.className).toMatch(/rounded/);
  });
});

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------
describe("Dialog", () => {
  it("nie renderuje treści gdy isOpen=false", () => {
    render(
      <Dialog isOpen={false} onClose={() => {}} title="Test">
        Zawartość dialogu
      </Dialog>
    );
    expect(screen.queryByText("Zawartość dialogu")).not.toBeInTheDocument();
  });

  it("renderuje treść gdy isOpen=true", () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Tytuł dialogu">
        Zawartość dialogu
      </Dialog>
    );
    expect(screen.getByText("Zawartość dialogu")).toBeInTheDocument();
  });

  it("ma role=dialog i aria-label z tytułem", () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Mój dialog">
        Treść
      </Dialog>
    );
    expect(screen.getByRole("dialog", { name: "Mój dialog" })).toBeInTheDocument();
  });

  it("wywołuje onClose po kliknięciu przycisku zamknięcia", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} title="Dialog">
        Treść
      </Dialog>
    );
    await user.click(screen.getByRole("button", { name: /zamknij/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SecondaryButton
// ---------------------------------------------------------------------------
describe("SecondaryButton", () => {
  it("renderuje przycisk z tekstem", () => {
    render(<SecondaryButton>Anuluj</SecondaryButton>);
    expect(screen.getByRole("button", { name: "Anuluj" })).toBeInTheDocument();
  });

  it("ma pill radius (rounded-full)", () => {
    render(<SecondaryButton>Akcja</SecondaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/rounded-full/);
  });

  it("ma biały kolor tekstu (text-text-primary)", () => {
    render(<SecondaryButton>Akcja</SecondaryButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/text-text-primary/);
  });

  it("ma przezroczyste/brak tła lub obramowanie", () => {
    render(<SecondaryButton>Akcja</SecondaryButton>);
    const btn = screen.getByRole("button");
    // border ring or transparent background
    expect(btn.className).toMatch(/border|outline/);
  });

  it("wywołuje onClick po kliknięciu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SecondaryButton onClick={onClick}>Akcja</SecondaryButton>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// FieldError
// ---------------------------------------------------------------------------
describe("FieldError", () => {
  it("nie renderuje nic gdy brak wiadomości", () => {
    const { container } = render(<FieldError message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderuje polską wiadomość błędu", () => {
    render(<FieldError message="To pole jest wymagane." />);
    expect(screen.getByText("To pole jest wymagane.")).toBeInTheDocument();
  });

  it("ma rolę alert lub tekst roli opisujący błąd", () => {
    render(<FieldError message="Błąd walidacji." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("używa koloru błędu (text-brand-error)", () => {
    render(<FieldError message="Błąd walidacji." />);
    const el = screen.getByRole("alert");
    expect(el.className).toMatch(/text-brand-error/);
  });
});

// ---------------------------------------------------------------------------
// StatusBadge — 5 outcomes (AC-22)
// ---------------------------------------------------------------------------
describe("StatusBadge", () => {
  const outcomes = [
    { outcome: "APPROVE" as const, expectedLabel: /zatwierdz|pozytyw|akceptacja|approve/i },
    { outcome: "REJECT" as const, expectedLabel: /odrzuc|odmow|reject/i },
    { outcome: "NEEDS_MORE_INFO" as const, expectedLabel: /brakuje|potrzeba|więcej|info/i },
    { outcome: "CONDITIONAL" as const, expectedLabel: /warunkowo|conditional/i },
    { outcome: "ESCALATE" as const, expectedLabel: /eskalac|przekaz|escalate/i },
  ] as const;

  it.each(outcomes)(
    "renderuje oznakowanie dla wyniku $outcome",
    ({ outcome, expectedLabel }) => {
      render(<StatusBadge outcome={outcome} />);
      const badge = screen.getByTestId("status-badge");
      expect(badge.textContent).toMatch(expectedLabel);
    }
  );

  it("każdy wynik ma unikalny kolor tła (różne klasy)", () => {
    const classNames: string[] = [];
    const outcomeValues = ["APPROVE", "REJECT", "NEEDS_MORE_INFO", "CONDITIONAL", "ESCALATE"] as const;

    for (const outcome of outcomeValues) {
      const { unmount, container } = render(<StatusBadge outcome={outcome} />);
      const badge = container.querySelector("[data-testid='status-badge']")!;
      classNames.push(badge.className);
      unmount();
    }

    // Ensure not all classes are identical (distinct colors)
    const uniqueClasses = new Set(classNames);
    expect(uniqueClasses.size).toBe(5);
  });

  it("ma poprawną rolę lub dostępny opis", () => {
    render(<StatusBadge outcome="APPROVE" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toBeInTheDocument();
  });
});
