# Agent Config Examples

These are reference agent configurations from prior course cohorts, kept as examples for participants working in Java/Spring Boot.

## Folders

- `claude-code-java-spring-boot/` — Claude Code sub-agent definitions (be-developer, fe-developer, qa-engineer) for a Java 21 + Spring Boot backend with a React/Vite frontend. Shows how to wire skills, MCP servers, persistent memory, and the Vercel AI SDK UI Message Stream SSE protocol.
- `codex-java-spring/` — OpenAI Codex CLI config (`config.toml`) plus sub-agent definitions for Java/Spring Boot, Next.js frontend, and E2E QA.

## Notes

- Windows absolute paths (`D:\...`, `C:\Users\...`) have been replaced with `<your-project-root>` / `<your-home>` placeholders. Adjust to your machine.
- The active `.claude/` and `.codex/` configs at the repo root are TypeScript/Node.js-first and will be configured live during the course. Use these Java examples as a reference for how to structure agent configs for a different stack.

## How to adapt for your stack

1. Copy the agent definition files into your project's `.claude/agents/` (Claude Code) or `.codex/agents/` (Codex).
2. Replace stack-specific references (Java/Spring Boot, Maven, JUnit) with your stack equivalents.
3. Point the persistent-memory directory path to your project root.
4. Adjust the skills list (`skills-lock.json`) to match the skills you have installed.
