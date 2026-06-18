---
name: feedback-e2e-lessons
description: Hard-won Playwright E2E lessons for this project — sentinel contamination, React date input, strict-mode violations, stale dev server
metadata:
  type: feedback
---

## React date input (AC-04 future-date validation)

Raw `el.value = v` + `dispatchEvent(new Event("change"))` does NOT trigger React synthetic onChange. Must use React's internal nativeInputValueSetter:

```js
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, "value"
)?.set;
nativeInputValueSetter?.call(el, v);
el.dispatchEvent(new Event("input", { bubbles: true }));
el.dispatchEvent(new Event("change", { bubbles: true }));
```

Also remove the `max` attribute first so the DOM accepts a future date value.

**Why:** React hooks onto the native setter for controlled inputs, not the DOM change event.
**How to apply:** Any time a test needs to set a date/number input to a value outside its natural range constraints.

---

## Playwright strict-mode violation on `text=Zwrot`

`page.locator("text=Zwrot")` matches multiple elements ("Zwrot" appears in subtitle paragraph, radio label, and "Powód zwrotu" label). Use `page.getByText("Zwrot", { exact: true })` instead.

**Why:** Playwright strict mode throws when a locator matches >1 element.
**How to apply:** Always use `exact: true` for short Polish words that appear in compound labels.

---

## AC-08/09 image validation errors require prior field fill

Image validation runs on file change immediately (client-side), but the error element may not render if other required fields are empty (different rendering path). Fill `requestType`, `category`, `model`, `purchaseDate` BEFORE uploading the invalid image.

**Why:** The error is rendered into the same `role="alert"` container that also shows form-level errors; empty required fields may block rendering.
**How to apply:** In any image validation test, fill other required fields first.

---

## Stale dev server causes wrong scenario responses

If a `next dev` process is already running on port 3000 WITHOUT mock env vars, Playwright's `reuseExistingServer: true` reuses it. The app then calls real OpenRouter and all scenario tests receive APPROVE regardless of sentinel.

**Why:** `reuseExistingServer` only checks the URL, not the env vars.
**How to apply:** Before running `npm run test:e2e`, ensure no stale dev server is running (`netstat -an | grep 3000`). On CI always set `CI=true` so `reuseExistingServer: false`.

---

## Sentinel contamination in vision response

If `buildVisionResponse()` includes any sentinel string (e.g. `"TEST-REJECT"`) in the description text, the decision call will match that sentinel via `extractSentinel()` regardless of which model field was used. Remove sentinel strings from all mock response content.

**Why:** `imageDescription` is injected verbatim into the decision prompt body. `extractSentinel()` scans the entire raw request body, so any sentinel in the description poisons the decision call.
**How to apply:** Review any new mock response content — never put sentinel strings in returned text.
