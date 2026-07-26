# Claude Code Rules

## Token Saving
- Work on ONE task only.
- Read ONLY the files needed.
- Never analyze the whole project unless requested.
- Never rewrite unchanged files.
- Never regenerate large files for small edits.
- Reuse existing components.
- Keep responses under 150 words unless asked.
- Do not explain code unless requested.
- Stop after completing the task.
- If information is missing, ask one short question.

## Editing
- Modify the smallest possible amount of code.
- Show only changed code when possible.
- Preserve existing architecture.
- Do not refactor unrelated code.

## UI
- Keep UI clean and minimal.
- Fix spacing, grammar, and consistency automatically.
- Use reusable components.

## Database
- Fetch only required columns.
- Optimize queries.
- Never duplicate database logic.

## Project Context (so it never gets repeated in prompts)
- Stack: React + Vite + TypeScript + Tailwind + Supabase
- Project: FNS Cargo — international cargo & logistics
- Theme: deep navy primary, gold/orange accent, mobile-first
