---
name: feedback-jsdom-file-upload
description: jsdom quirks for file input testing — URL.createObjectURL and applyAccept
metadata:
  type: feedback
---

`user.upload()` with a file whose MIME type doesn't match the `accept` attribute is silently dropped by `@testing-library/user-event` (applyAccept:true by default).

**Why:** Testing file validation for rejected formats (GIF, BMP, etc.) requires bypassing the accept filter so our JS validation code actually runs.

**How to apply:**
- Add `URL.createObjectURL = () => "blob:mock-url"` and `URL.revokeObjectURL = () => {}` stubs to `test/setup-jsdom.ts` (jsdom doesn't implement these).
- For tests that upload a disallowed format, use `userEvent.setup({ applyAccept: false })` so the file reaches the onChange handler.
- For valid formats, `userEvent.setup()` with default settings is fine.
