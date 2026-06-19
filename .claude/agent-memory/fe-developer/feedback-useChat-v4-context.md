---
name: useChat-v4-context-mechanism
description: How to attach immutable CaseContext to every useChat v4 request — static body option confirmed
metadata:
  type: feedback
---

In `@ai-sdk/react@1.2.12` (v4), the correct mechanism to attach an immutable
`context` object to every `/api/chat` request is the **static `body` option**:

```tsx
useChat({
  api: '/api/chat',
  body: { context },   // sent alongside `messages` on every request
  initialMessages: [...],
})
```

**Why:** `DefaultChatTransport` and `prepareSendMessagesRequest` are v5-only and do
not exist in v4. The v4 per-request options are:
- `body` (static, on every request) — use for immutable session data like `CaseContext`
- `experimental_prepareRequestBody` — for dynamic per-request body shaping
- `handleSubmit(event, { body: {...} })` — per-submit override

**How to apply:** Always use static `body` for immutable session context.
Use `experimental_prepareRequestBody` only if the body must differ per message.
Never reference `DefaultChatTransport` or `prepareSendMessagesRequest` with v4.

Related: [[jsdom-file-upload-quirks]]
