import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeForm } from "./IntakeForm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

const FUTURE_DATE = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
const PAST_DATE = "2024-01-15";

const VALID_IMAGE = makeFile("foto.jpg", "image/jpeg", 1024);

// ---------------------------------------------------------------------------
// Setup: mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: fill the form with valid data
// ---------------------------------------------------------------------------

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  // 1. Request type = Zwrot (default complaint to avoid reason being required)
  await user.click(screen.getByRole("radio", { name: /zwrot/i }));

  // 2. Category
  await user.selectOptions(screen.getByRole("combobox", { name: /kategoria/i }), "Laptop");

  // 3. Model
  await user.type(screen.getByRole("textbox", { name: /model/i }), "Dell XPS 15");

  // 4. Date of purchase (past date)
  const dateInput = screen.getByLabelText(/data zakupu/i);
  await user.clear(dateInput);
  await user.type(dateInput, PAST_DATE);

  // 5. Upload image
  const fileInput = screen.getByTestId("image-input");
  await user.upload(fileInput, VALID_IMAGE);
}

// ---------------------------------------------------------------------------
// TAC-001-01 — reason required for Reklamacja, optional for Zwrot
// ---------------------------------------------------------------------------
describe("IntakeForm — pole powodu (TAC-001-01, AC-05)", () => {
  it("pole powodu jest opcjonalne dla Zwrot", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /zwrot/i }));

    const reasonLabel = screen.getByText(/powód|opis/i);
    expect(reasonLabel.textContent).toMatch(/opcjonalny/i);
  });

  it("pole powodu jest wymagane dla Reklamacja", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /reklamacja/i }));

    const reasonLabel = screen.getByText(/powód|opis|usterka/i);
    expect(reasonLabel.textContent).toMatch(/wymagany|obowiązkowy/i);
  });

  it("formularz Reklamacja z pustym powodem blokuje submit i pokazuje błąd", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<IntakeForm onSuccess={onSuccess} />);

    // Select Reklamacja
    await user.click(screen.getByRole("radio", { name: /reklamacja/i }));

    // Fill other required fields
    await user.selectOptions(screen.getByRole("combobox", { name: /kategoria/i }), "Laptop");
    await user.type(screen.getByRole("textbox", { name: /model/i }), "Dell XPS 15");
    const dateInput = screen.getByLabelText(/data zakupu/i);
    await user.clear(dateInput);
    await user.type(dateInput, PAST_DATE);
    const fileInput = screen.getByTestId("image-input");
    await user.upload(fileInput, VALID_IMAGE);

    // Leave reason empty and submit
    const submitBtn = screen.getByRole("button", { name: /wyślij|zatwierdź|prześlij/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("przełączenie z Reklamacja na Zwrot usuwa wymagalność powodu", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    // Start with Reklamacja
    await user.click(screen.getByRole("radio", { name: /reklamacja/i }));
    let reasonLabel = screen.getByText(/powód|opis|usterka/i);
    expect(reasonLabel.textContent).toMatch(/wymagany|obowiązkowy/i);

    // Switch to Zwrot
    await user.click(screen.getByRole("radio", { name: /zwrot/i }));
    reasonLabel = screen.getByText(/powód|opis/i);
    expect(reasonLabel.textContent).toMatch(/opcjonalny/i);
  });
});

// ---------------------------------------------------------------------------
// AC-04 — future date blocked
// ---------------------------------------------------------------------------
describe("IntakeForm — data zakupu (AC-04)", () => {
  it("blokuje przesłanie gdy data zakupu jest w przyszłości", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<IntakeForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole("radio", { name: /zwrot/i }));
    await user.selectOptions(screen.getByRole("combobox", { name: /kategoria/i }), "Laptop");
    await user.type(screen.getByRole("textbox", { name: /model/i }), "Dell XPS");

    const dateInput = screen.getByLabelText(/data zakupu/i);
    await user.clear(dateInput);
    await user.type(dateInput, FUTURE_DATE);

    const fileInput = screen.getByTestId("image-input");
    await user.upload(fileInput, VALID_IMAGE);

    await user.click(screen.getByRole("button", { name: /wyślij|zatwierdź|prześlij/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/przyszłość|przyszłości/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-08/09 — image format and size (TAC-001-02)
// ---------------------------------------------------------------------------
describe("IntakeForm — walidacja obrazu (TAC-001-02, AC-08/09)", () => {
  it("odrzuca niedozwolony format (GIF) z polskim komunikatem", async () => {
    // applyAccept: false — let our JS validation run, not browser accept filter
    const user = userEvent.setup({ applyAccept: false });
    render(<IntakeForm onSuccess={vi.fn()} />);

    const gifFile = makeFile("foto.gif", "image/gif", 1024);
    const fileInput = screen.getByTestId("image-input");
    await user.upload(fileInput, gifFile);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/format|JPEG|PNG|WebP/i);
  });

  it("odrzuca plik za duży (>10 MB) z polskim komunikatem", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    const bigFile = makeFile("duzy.jpg", "image/jpeg", 11 * 1024 * 1024);
    const fileInput = screen.getByTestId("image-input");
    await user.upload(fileInput, bigFile);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/10 MB|rozmiar|duży/i);
  });

  it("akceptuje plik JPEG w limicie rozmiaru", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    const validFile = makeFile("ok.jpg", "image/jpeg", 1024 * 1024);
    const fileInput = screen.getByTestId("image-input");
    await user.upload(fileInput, validFile);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-11 — only one image
// ---------------------------------------------------------------------------
describe("IntakeForm — tylko jeden obraz (AC-11)", () => {
  it("dodanie drugiego obrazu zastępuje pierwszy", async () => {
    const user = userEvent.setup();
    render(<IntakeForm onSuccess={vi.fn()} />);

    const file1 = makeFile("foto1.jpg", "image/jpeg", 1024);
    const file2 = makeFile("foto2.png", "image/png", 2048);
    const fileInput = screen.getByTestId("image-input");

    await user.upload(fileInput, file1);
    await waitFor(() => {
      expect(screen.getByText(/foto1\.jpg/i)).toBeInTheDocument();
    });

    await user.upload(fileInput, file2);
    await waitFor(() => {
      expect(screen.getByText(/foto2\.png/i)).toBeInTheDocument();
      expect(screen.queryByText(/foto1\.jpg/i)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAC-001-06/07 — 422 inline errors, 5xx error state
// ---------------------------------------------------------------------------
describe("IntakeForm — obsługa błędów API", () => {
  it("wyświetla inline błędy po odpowiedzi 422 (TAC-001-06)", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        errors: {
          model: "Nazwa modelu jest nieprawidłowa.",
          purchaseDate: "Data zakupu jest nieprawidłowa.",
        },
      }),
    });

    render(<IntakeForm onSuccess={onSuccess} />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: /wyślij|zatwierdź|prześlij/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nazwa modelu jest nieprawidłowa\./)).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("wyświetla ogólny błąd po odpowiedzi 5xx (TAC-001-07)", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    });

    render(<IntakeForm onSuccess={onSuccess} />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: /wyślij|zatwierdź|prześlij/i }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const hasGeneralError = alerts.some((a) =>
        /błąd|niedostępny|serwis|spróbuj|problem/i.test(a.textContent ?? "")
      );
      expect(hasGeneralError).toBe(true);
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("wywołuje onSuccess po pomyślnej odpowiedzi 200", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    const mockResponse = {
      decision: {
        outcome: "APPROVE",
        greeting: "Witaj",
        justification: "Uzasadnienie",
        nextSteps: "Kroki",
        missing: null,
        conditions: null,
        disclaimer: "Niewiążąca ocena.",
      },
      imageAnalysis: { description: "Zdjęcie laptopa.", usable: true, signals: null },
      seedMessages: [],
      context: {
        requestType: "return",
        category: "Laptop",
        model: "Dell XPS 15",
        purchaseDate: PAST_DATE,
        imageDescription: "Zdjęcie laptopa.",
        policyKind: "return",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    render(<IntakeForm onSuccess={onSuccess} />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: /wyślij|zatwierdź|prześlij/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });
});
