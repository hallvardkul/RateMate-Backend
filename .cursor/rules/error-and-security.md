---
description: Guard-clause error handling and security hygiene
alwaysApply: true
---

### Error handling
- Start every function with **guard clauses**. Early-return on invalid args.
- Return **typed Error objects** (`ApiError`, `ValidationError`) instead of generic `Error`.
- Never swallow errors; bubble them to Azure Functions' `context.log.error`.

### Security
- **Never** log secrets or access tokens.
- Read credentials strictly from `process.env.*`; never hard-code.
- Validate all user input & sanitize text before DB writes. 