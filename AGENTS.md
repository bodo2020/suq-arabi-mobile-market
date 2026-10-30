# AGENTS.md

## Rules
- The `customer-smart-ideas` edge function calls Google Gemini directly with the vault key `GEMINI_API_KEY`; retired model names (e.g. `gemini-2.5-*`) return 404 that surfaces to customers as a 503 `ai_temporarily_unavailable`. Keep the model on a currently available generation (as of 2026-10-30: `gemini-3.5-flash-lite`) and log provider status/body on failure.
