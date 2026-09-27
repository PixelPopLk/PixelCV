# Lanka CV Maker — Cloudflare Workers

A no-Python CV builder designed around a simple question-based flow:

1. Choose a template.
2. Add the required basics.
3. Add any optional sections you have.
4. Preview the CV live.
5. Download an A4 PDF.

Gemini is used only for small content jobs (About Me and experience wording). The CV itself is rendered by HTML/CSS in the browser.

## Project structure

```text
lanka-cv-maker/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ src/
│  └─ index.js
├─ wrangler.jsonc
├─ package.json
├─ .dev.vars.example
├─ .gitignore
└─ README.md
```

## Cloudflare setup

This project uses Cloudflare Workers Static Assets. The Worker handles `/api/ai`, while the files in `public/` are served as static assets.

### 1. Install

```bash
npm install
```

### 2. Add the Gemini secret for local development

Copy `.dev.vars.example` to `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

Then put your real key in `.dev.vars`:

```text
GEMINI_API_KEY="YOUR_REAL_KEY"
```

The key is never shipped to the browser. The browser calls `/api/ai`; the Worker calls Gemini.

### 3. Pick your Lite model

`wrangler.jsonc` defaults to:

```json
"GEMINI_MODEL": "gemini-3.5-flash-lite"
```

You can override it with another model your key can access, for example:

```text
GEMINI_MODEL="gemini-2.5-flash-lite"
```

### 4. Local test

```bash
npm run dev
```

Open the URL Wrangler gives you.

### 5. Deploy

First authenticate Wrangler if needed:

```bash
npx wrangler login
```

Set the production secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Then deploy:

```bash
npm run deploy
```

## Notes on the form

The required basics in this version are:

- Full name
- Age
- Email
- Phone

Everything else is optional.

A/L and O/L are also optional sections. When enabled, the UI automatically starts with at least 3 A/L rows or 9 O/L rows. Extra subjects can be added.

The result visualization is a simple grade-distribution chart (counts of A/B/C/S/W) plus the subject/grade table. It does not invent numeric marks.

## AI behavior

`POST /api/ai` accepts only these actions:

### Summary

```json
{
  "action": "summary",
  "input": {
    "name": "...",
    "title": "...",
    "education": "...",
    "experience": "...",
    "skills": "...",
    "projects": "...",
    "aboutMe": "..."
  }
}
```

### Experience

```json
{
  "action": "experience",
  "input": {
    "title": "...",
    "company": "...",
    "description": "..."
  }
}
```

The Worker prompt explicitly tells Gemini not to invent facts. The front end does not send the uploaded photo to Gemini.

## PDF

PDF export is performed in the browser with `html2pdf.js`, so no Python server is required. The script is loaded from a public CDN in `index.html`. A browser print fallback is used if the library is unavailable.

## Security notes

- Keep `.dev.vars` out of Git.
- Keep `GEMINI_API_KEY` as a Cloudflare secret, not a `vars` value.
- The Worker limits the AI request body to 12 KB for this MVP.
- The API key is sent to Gemini through the `x-goog-api-key` header from the Worker.
