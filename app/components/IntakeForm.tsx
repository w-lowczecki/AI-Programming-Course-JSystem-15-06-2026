"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  IntakeFormSchema,
  EQUIPMENT_CATEGORIES,
  validateImageFile,
  type AnalyzeResponse,
} from "@/lib/contracts";
import { PrimaryButton } from "./PrimaryButton";
import { Select, type SelectOption } from "./ui/Select";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { FieldError } from "./ui/FieldError";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RequestType = "complaint" | "return";

interface FormState {
  requestType: RequestType;
  category: string;
  model: string;
  purchaseDate: string;
  reason: string;
}

type FieldErrors = Partial<Record<keyof FormState | "image" | "form", string>>;

interface IntakeFormProps {
  onSuccess: (result: AnalyzeResponse) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: SelectOption[] = EQUIPMENT_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

const REQUEST_TYPE_OPTIONS: SelectOption[] = [
  { value: "complaint", label: "Reklamacja" },
  { value: "return", label: "Zwrot" },
];

const INITIAL_STATE: FormState = {
  requestType: "return",
  category: "",
  model: "",
  purchaseDate: "",
  reason: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntakeForm({ onSuccess }: IntakeFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isComplaint = form.requestType === "complaint";

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field on change
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── Image handling ────────────────────────────────────────────────────────

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFieldErrors((prev) => ({ ...prev, image: validation.message }));
      setImage(null);
      setImagePreview(null);
      return;
    }

    setFieldErrors((prev) => ({ ...prev, image: undefined }));
    setImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function handleRemoveImage() {
    setImage(null);
    setImagePreview(null);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    const parsed = IntakeFormSchema.safeParse({
      requestType: form.requestType,
      category: form.category || undefined,
      model: form.model,
      purchaseDate: form.purchaseDate,
      reason: form.reason || undefined,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormState;
        if (!errors[field]) errors[field] = issue.message;
      }
    }

    if (!image) {
      errors.image = "Zdjęcie urządzenia jest wymagane. Dodaj zdjęcie przed wysłaniem.";
    }

    return errors;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.append("requestType", form.requestType);
      formData.append("category", form.category);
      formData.append("model", form.model);
      formData.append("purchaseDate", form.purchaseDate);
      if (form.reason) formData.append("reason", form.reason);
      formData.append("image", image!);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as AnalyzeResponse;
        onSuccess(data);
        return;
      }

      if (res.status === 422) {
        const body = (await res.json()) as { errors?: Record<string, string> };
        if (body.errors) {
          setFieldErrors(body.errors as FieldErrors);
        } else {
          setGeneralError("Dane formularza są nieprawidłowe. Sprawdź pola i spróbuj ponownie.");
        }
        return;
      }

      // 5xx or other
      setGeneralError(
        "Wystąpił problem z serwisem. Nie udało się przetworzyć zgłoszenia. Spróbuj ponownie za chwilę."
      );
    } catch {
      setGeneralError(
        "Wystąpił problem z połączeniem. Sprawdź internet i spróbuj ponownie."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* General error banner */}
      {generalError && (
        <div role="alert" className="bg-brand-error/10 border border-brand-error text-brand-error px-4 py-3 rounded-sm text-base">
          {generalError}
        </div>
      )}

      {/* 1. Request type — Reklamacja / Zwrot */}
      <fieldset>
        <legend className="text-base font-bold text-text-primary mb-2">
          Typ zgłoszenia
        </legend>
        <div className="flex gap-4">
          {REQUEST_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer text-text-primary"
            >
              <input
                type="radio"
                name="requestType"
                value={opt.value}
                checked={form.requestType === opt.value}
                onChange={() => {
                  setField("requestType", opt.value as RequestType);
                  // Clear reason error when switching
                  setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                }}
                className="accent-brand-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.requestType} />
      </fieldset>

      {/* 2. Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-base font-bold text-text-primary mb-1"
        >
          Kategoria sprzętu
        </label>
        <Select
          id="category"
          options={CATEGORY_OPTIONS}
          value={form.category}
          onChange={(v) => setField("category", v)}
          placeholder="Wybierz kategorię..."
          aria-label="Kategoria sprzętu"
          aria-invalid={!!fieldErrors.category}
        />
        <FieldError message={fieldErrors.category} />
      </div>

      {/* 3. Model */}
      <div>
        <label
          htmlFor="model"
          className="block text-base font-bold text-text-primary mb-1"
        >
          Nazwa / model urządzenia
        </label>
        <Input
          id="model"
          type="text"
          value={form.model}
          onChange={(e) => setField("model", e.target.value)}
          placeholder="np. Samsung Galaxy S24"
          aria-label="Nazwa/model urządzenia"
          aria-invalid={!!fieldErrors.model}
        />
        <FieldError message={fieldErrors.model} />
      </div>

      {/* 4. Date of purchase */}
      <div>
        <label
          htmlFor="purchaseDate"
          className="block text-base font-bold text-text-primary mb-1"
        >
          Data zakupu
        </label>
        <Input
          id="purchaseDate"
          type="date"
          value={form.purchaseDate}
          onChange={(e) => setField("purchaseDate", e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          aria-label="Data zakupu"
          aria-invalid={!!fieldErrors.purchaseDate}
        />
        <FieldError message={fieldErrors.purchaseDate} />
      </div>

      {/* 5. Reason */}
      <div>
        <label
          htmlFor="reason"
          className="block text-base font-bold text-text-primary mb-1"
        >
          {isComplaint ? (
            <>Opis usterki <span className="text-brand-error">(wymagany)</span></>
          ) : (
            <>Powód zwrotu <span className="text-text-muted">(opcjonalny)</span></>
          )}
        </label>
        <Textarea
          id="reason"
          value={form.reason}
          onChange={(e) => setField("reason", e.target.value)}
          placeholder={
            isComplaint
              ? "Opisz usterkę — np. martwe piksele na ekranie, nie włącza się..."
              : "Opcjonalnie — opisz powód zwrotu..."
          }
          rows={4}
          aria-label={isComplaint ? "Opis usterki (wymagany)" : "Powód zwrotu (opcjonalny)"}
          aria-required={isComplaint}
          aria-invalid={!!fieldErrors.reason}
        />
        <FieldError message={fieldErrors.reason} />
      </div>

      {/* 6. Image upload */}
      <div>
        <span className="block text-base font-bold text-text-primary mb-1">
          Zdjęcie urządzenia
        </span>
        <p className="text-sm text-text-muted mb-2">
          Akceptowane formaty: JPEG, PNG, WebP. Maks. 10 MB.
        </p>

        {/* File input — always present (sr-only), used by dropzone label and tests */}
        <input
          id="image"
          data-testid="image-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleImageChange}
        />

        {imagePreview ? (
          <div className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Podgląd zdjęcia urządzenia"
              className="w-32 h-32 object-cover rounded-card border border-bg-press"
            />
            <p className="text-sm text-text-secondary mt-1">{image?.name}</p>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="mt-1 text-sm text-brand-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Usuń zdjęcie
            </button>
          </div>
        ) : (
          <label
            htmlFor="image"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-bg-press rounded-sm cursor-pointer hover:border-text-secondary transition-colors"
          >
            <span className="text-text-muted text-sm">
              Kliknij lub upuść plik tutaj
            </span>
          </label>
        )}

        <FieldError message={fieldErrors.image} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="text-text-secondary text-base text-center" aria-live="polite">
          Analizujemy zdjęcie i przygotowujemy ocenę…
        </p>
      )}

      {/* 7. Submit */}
      <PrimaryButton
        type="submit"
        disabled={isLoading}
        className="self-start"
      >
        {isLoading ? "Przetwarzanie…" : "Wyślij zgłoszenie"}
      </PrimaryButton>
    </form>
  );
}
