# AI w Programowaniu: Od Pomysłu do MVP
### Szkolenie JSystems — kurs otwarty (czerwiec 2026)

---

**Prowadzący:** [Łukasz Matuszewski](https://devpowers.com/) | [JSystems](https://jsystems.pl)

**Opis szkolenia:** [AI dla Programistów — Od Pomysłu do MVP](https://jsystems.pl/szkolenia-ai;ai_dla_programistow_od_pomyslu_do_mvp.szczegoly)

---

## O repozytorium

To repozytorium zawiera materiały do 5-dniowego kursu **AI w Programowaniu** prowadzonego przez JSystems. Kurs skupia się na workflow pracy z agentami AI (Claude Code, OpenAI Codex CLI), a nie na jednym konkretnym narzędziu.

Uczestnicy pracują w swoim preferowanym języku programowania (Java, Python, C#, Go, Rust i inne). Prowadzący demonstruje rozwiązania w **TypeScript/Node.js**, na przykład z **Vercel AI SDK**.

### Projekt kursu

Uczymy się razem Agentów AI do kodowania (np. Codex, Claude, Antigravity) budując razem Multimodalną aplikację AI — na przykład agent weryfikujący usterki, zwroty i reklamacje sprzętu elektronicznego.

Konkretny projekt i tech stack ustalane są live z grupą poprzez proces: research/dyskusja → PRD (Product Requirements Document) → Design System → ADR (Architecture Decision Records) → Plan z matrycą zależności zadań i sub-agentów → implementacja z sub-agentami.

---

## Materiały kursu

Główne notatki i zasoby znajdziesz w folderze `/course-materials`:

- 📓 [**Course Notes — AI in Programming**](course-materials/Course%20Notes%20-%20AI%20in%20Programming.md) — główne notatki: trendy, narzędzia, benchmarki, metodologie agentic coding, best practices.
- 📅 [**Agenda kursu**](course-materials/course-agenda.md) — program 5-dniowego szkolenia.
- 📜 **Podsumowania** i **historia czatu Zoom** z poszczególnych dni (`course-materials/summary+chat-history`)
- 📄 Przykłady promptów (`course-materials/Prompt examples/`), m.in.:
  - [PRD generation](course-materials/Prompt%20examples/PRD-electronics-returns-complains-app.md)
  - [Plan for SubAgents](course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md)
  - [Design System reverse-engineering with Playwright](course-materials/Prompt%20examples/Design%20System%20reverse-engineering%20with%20Playwright.md)
- 🎓 Technika Ralph Wiggum Bash Loop (`course-materials/how-to-ralph-wiggum/`) - obecnie Codex i Claude mają już funkcjonalności, które ją częściowo zastępują (np. `/loop` i `/goal`)
- 🔬 Wyniki Deep Research (`course-materials/Research/`)
- Claude Code example configs:
  - `.bashrc` functions to use Claude CLI with other providers (e.g. OpenRouter, Z.ai): [course-materials/.bashrc](course-materials/.bashrc)
  - `.claude/` example config folder for the user with `statusline.sh`, permissions and global instructions (`course-materials/.claude-example/`)

---

## Branche - Przykładowa aplikacja

- Główny branch `main` zawiera materiały szkoleniowe i bazowe pliki z pustymi katalogami `app/` do budowania aplikacji oraz `docs/` do zapisywania PRD, ADR i planów.
- Branch `feature/hardware-service-decision-copilot-prd` zawiera zaimplementowany przez agentów AI kod aplikacji szkoleniowej oraz gotowe pliki PRD, Design Guidelines, ADR i plany.

---

## Struktura repozytorium

```
app/                 Aplikacja budowana podczas kursu (start: pusty scaffold)
assets/              Design tokens, logo, favicon (dodawane w trakcie kursu)
docs/                PRD, ADR, design system, plany (tworzone podczas kursu)
course-materials/    Notatki, skrypty, przykłady, badania
```

---

## Technologie

Kurs jest stack-agnostic. Technologie zostaną wybrane live z grupą podczas ADR. Możliwe opcje:

- **TypeScript/Node.js** (demo prowadzącego): Next.js, Vercel AI SDK, (opcja: Mastra AI)
- **Java**: Spring Boot, Spring AI (zobacz `examples/agent-configs/`)
- Inne stacki wg preferencji uczestników

---

## Narzędzia AI

Główny agent używany na kursie: **Claude Code** lub **OpenAI Codex** (wybór zależy od preferencji grupy). Omawiane koncepcje są transferowalne na Antigravity, OpenCode, Cursor, Zed, Junie, Copilot i inne.

---

## Konfiguracja środowiska

Szczegóły w [`.env.example`](.env.example).

Wymagane:
- Klucz API (OpenAI, OpenRouter, lub inny provider)
- Agent AI z zapasem tokenów (np. Claude Code lub Codex)
- Node.js i npm (do instalowania agentów CLI i skills, aplikacja może bazować np. na BE w Java lub Python)
- Git

---

## Kontakt

- **JSystems:** [jsystems.pl](https://jsystems.pl)
- **Prowadzący:** [Łukasz Matuszewski](https://devpowers.com/)
