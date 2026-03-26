# Preloaded Site Generation with Design System

## Problem

Every page navigation triggers a Gemini API call taking 8-15 seconds. Pages are generated independently, leading to inconsistent styling (different fonts, colors, layouts between pages). Users wait on every click.

## Solution

Two-phase generation with SSE streaming. When user clicks "fabricate":

1. **Phase 1**: Generate a CSS design system (colors, fonts, spacing, component styles) — small output, ~2-3s
2. **Phase 2**: Generate all 5 pages in parallel, each including the design system CSS — ~5-8s concurrent

Total wall-clock: ~8-11s. After that, all navigation is instant.

## Architecture

### New Backend Endpoint: `POST /api/generate-site`

Replaces `POST /api/generate`. Single endpoint that generates an entire site.

**Request:**
```json
{
  "project": "Lunar Café",
  "instructions": "modern minimalist design",
  "sessionId": 1234567890
}
```

**Response:** Server-Sent Events stream. Each event is one of:

```
event: design-system
data: {"css": "<style>:root { --primary: #ff6b35; ... }</style>"}

event: page
data: {"path": "/", "html": "<!DOCTYPE html>..."}

event: page
data: {"path": "/about", "html": "<!DOCTYPE html>..."}

event: done
data: {"totalPages": 5, "elapsed": 9200}

event: error
data: {"path": "/pricing", "message": "Generation failed"}
```

### Backend Flow (geminiService.js)

```
generateSite(sessionId, projectName, instructions)
  │
  ├─ Step 1: Call Gemini to generate design system CSS
  │   Prompt: "Generate a CSS design system for [project]..."
  │   Output: CSS custom properties, component classes, font imports
  │   ~2-3 seconds (small output, ~1-2KB)
  │
  └─ Step 2: Fire 5 parallel generatePage() calls
      Each prompt includes the design system CSS verbatim
      Each page streams back via SSE as soon as it completes
      Pages: /, /about, /features, /pricing, /contact
```

### Design System Prompt

The design system call generates:
- Google Font `<link>` tags (a distinctive pair, never Inter/Roboto/Arial)
- CSS custom properties (colors, spacing, typography scale)
- Base component styles (nav, buttons, cards, sections, footer)
- Responsive breakpoints

This CSS block is injected into every page prompt with the instruction: "Use ONLY this design system. Do not define new colors, fonts, or component styles."

### Page Prompt Changes

Current prompt asks each page to invent its own styling. New prompt:

```
Generate the {pageName} page for "{projectName}" at {path}.
{customInstructions}

USE THIS DESIGN SYSTEM EXACTLY — do not add new fonts, colors, or override these styles:
{designSystemCSS}

TECHNICAL:
- Responsive, complete HTML page with <!DOCTYPE html>
- Include the design system CSS in a <style> tag in <head>
- Nav linking: /, /about, /features, /pricing, /contact (highlight active)
- Relative paths only. No target="_blank", no window.open()
- Real believable content. No images, no emojis — CSS/SVG/Unicode only.
- Include before </body>: [navigation script]

Output ONLY the HTML. No markdown fences. No explanation.
```

### Frontend Flow (DynamicPageRenderer.tsx)

The component changes from on-demand to preloaded:

1. On mount, open SSE connection to `POST /api/generate-site`
2. Show progress UI: "Generating design system..." → "Building pages (2/5)..."
3. As each `page` event arrives, cache it in `pageCache`
4. Auto-navigate to `/` when homepage arrives (user sees content ASAP)
5. On `done`, all pages are cached — navigation is instant

**State changes:**
- Remove `activeRequests` tracking (no more per-page fetching)
- Remove `fetchPageContent` function
- Add `generationProgress` state: `{ phase: 'design-system' | 'pages' | 'done', pagesReady: number, totalPages: number }`
- `pageCache` is populated from SSE events, not individual fetches

### What Gets Removed

- `POST /api/generate` endpoint (replaced by `/api/generate-site`)
- `POST /api/session/init` endpoint (session init happens in generate-site)
- Per-page fetch logic in DynamicPageRenderer
- On-demand generation entirely — the system only pre-generates

### What Stays

- Backend as thin proxy (API key stays server-side)
- In-memory session cache (serves repeat requests instantly)
- HTML cleanup/validation
- Rate limiting (adjusted: 3 site generations per 5 min instead of 10 page generations)
- iframe rendering with postMessage navigation
- SessionView command bar (but URL input navigates cached pages only)
- Export/download functionality

### Rate Limit Adjustment

Current: 10 individual page requests per 5 minutes.
New: 3 site generation requests per 5 minutes (each generates 6 Gemini calls: 1 design system + 5 pages).

### SSE Implementation (Backend)

The Express route handler:
1. Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
2. Calls `geminiService.generateDesignSystem()` → emits `design-system` event
3. Fires 5x `geminiService.generatePage()` with `Promise.allSettled`
4. As each resolves, emits `page` event with path + HTML
5. After all settle, emits `done` event
6. On any individual failure, emits `error` event for that page (others continue)

### SSE Implementation (Frontend)

Uses `fetch()` with `response.body.getReader()` to consume the stream (not `EventSource`, since we need POST). Parses SSE format manually:
- Split on `\n\n` boundaries
- Extract `event:` and `data:` fields
- Route to appropriate handler

### Loading UX

Replace the current "fabricating..." spinner with a multi-phase progress indicator:

```
Phase 1: "crafting design system..."        [spinner]
Phase 2: "building pages... 2/5"            [progress bar or count]
Phase 3: (auto-navigate to homepage)         pages continue loading in background
```

The key UX insight: navigate to homepage as soon as it's ready (~8s), while remaining pages keep streaming in the background. User sees content faster.

### Error Handling

- If design system generation fails → abort everything, show error, offer retry
- If individual page fails → show the other 4, show error state for the failed page with retry button
- If SSE connection drops → show error with "regenerate site" button
- Timeout: 60 seconds for the entire flow (same as Vercel limit)

### SessionView Changes

The URL input bar behavior changes:
- Typing a path navigates to cached content (instant)
- If the path isn't one of the 5 pre-generated pages, show a message: "This page hasn't been generated"
- Quick-nav chips for the 5 pages, with visual indicator showing which are ready
- Remove "custom instructions" textarea (instructions are set at fabrication time, not per-page)

## Files to Modify

| File | Change |
|------|--------|
| `backend/services/geminiService.js` | Add `generateDesignSystem()`, add `generateSite()`, modify `buildPagePrompt()` to accept design system CSS |
| `backend/routes/api.js` | Replace `/api/generate` with `/api/generate-site` SSE endpoint, remove `/api/session/init` |
| `backend/middleware/index.js` | Adjust rate limit (10 per 5min → 3 per 5min) |
| `src/components/DynamicPageRenderer.tsx` | Replace on-demand fetch with SSE consumer, add progress UI |
| `src/components/SessionView.tsx` | Remove instructions textarea, update nav to show page readiness |
| `src/App.tsx` | No changes needed |

## Pages Generated

Fixed set: `/`, `/about`, `/features`, `/pricing`, `/contact`

## Timeline Comparison

| Scenario | Current | New |
|----------|---------|-----|
| First page visible | 8-15s | ~8-11s (homepage, as soon as ready) |
| Navigate to 2nd page | 8-15s more | 0s (already cached) |
| Navigate to 5th page | 8-15s more | 0s (already cached) |
| Total for all 5 pages | 40-75s sequential | ~8-11s total |
