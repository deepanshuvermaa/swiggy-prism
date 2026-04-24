# Security Policy — Swiggy Prism

## Data Handling Principles

### Zero Retention
- User prompts are processed **in-memory only** and discarded after cart assembly
- No PII (names, addresses, phone numbers, payment details) is stored at any layer
- LLM API calls use ephemeral sessions — no conversation history is persisted

### Sacred Data Compliance
Swiggy Prism strictly adheres to Swiggy's data ground rules:
- **No reselling** of any data obtained through Swiggy's APIs
- **No scraping** — all data access is through authorized MCP endpoints only
- **No secondary use** — SKU/pricing data is used solely for cart optimization within the active session
- **Brand attribution** — all Swiggy trademarks and branding are used with proper attribution

## Authentication & Authorization

### OAuth 2.0 Flow
```
User → Swiggy Prism → Swiggy OAuth Provider
                    ← Access Token (short-lived)
                    → MCP API calls with Bearer token
                    ← Cart/SKU responses
```

- Access tokens are **short-lived** (15-minute expiry) and stored only in process memory
- Refresh tokens use **rotating refresh** — each use invalidates the previous token
- All token exchanges happen over **TLS 1.3**
- No tokens are written to disk, logs, or external storage

## Transport Security

- All MCP communication uses HTTPS with **TLS 1.3** minimum
- Certificate pinning for the `swiggy.deepanshuverma.site` endpoint
- Request/response payloads are validated against strict JSON schemas before processing

## Input Validation

- User prompts are sanitized before LLM processing to prevent prompt injection
- All MCP payloads are validated against TypeScript type schemas
- Budget values are bounds-checked (min ₹50, max ₹50,000)
- Ingredient quantities are validated against reasonable ranges

## Dependency Security

- Dependencies are audited via `npm audit` on every CI run
- Lockfile (`package-lock.json`) is committed and integrity-checked
- No dependencies with known critical CVEs are permitted

## Vulnerability Reporting

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email: security@swiggyprism.dev
3. Include: description, reproduction steps, and potential impact
4. We will acknowledge within 48 hours and patch within 7 days for critical issues

## Audit Log

| Date | Action | Details |
|------|--------|---------|
| 2026-04-24 | Initial security policy | v1.0 — Zero retention, OAuth 2.0, TLS 1.3 |
