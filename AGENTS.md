# AGENTS.md

## Project scope

This repository contains a container-bound Google Apps Script web app. Source files
that are pushed by clasp live in `src/`. Do not add a separate server or database;
Google Sheets is the only datastore.

## Required security invariants

- Treat the `t` query parameter as a bearer secret. Never log or expose student
  tokens, and never return STUDENTS rows to the browser.
- Never trust a browser-provided `student_id`. Resolve the active student from the
  token on every student read or write, then verify application ownership server-side.
- Escape all user-controlled strings before writing them to Sheets to prevent formula
  injection. Render user content with DOM text APIs, not `innerHTML`.
- Use a script lock around all multi-step writes. Keep application deletion as a
  soft delete and preserve application history.
- Never commit `.clasp.json`, clasp login data, environment files, or Google
  credential JSON files.

## Development conventions

- Keep server concerns split across the existing `.gs` service files and keep HTML,
  CSS, and browser JavaScript in their respective partials.
- Schema changes must be explicit, backwards-aware, and documented in `README.md`.
- Preserve `student_id` and `token` when syncing the same class and student number.
- Run syntax/static checks before `clasp push`. Do not deploy unless explicitly asked.
