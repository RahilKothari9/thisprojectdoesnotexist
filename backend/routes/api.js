const express = require('express');
const GeminiService = require('../services/geminiService');
const { validateGenerateRequest, generationLimiter } = require('../middleware');

const router = express.Router();
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Generate a single page (used for homepage + on-demand pages)
router.post('/generate',
  generationLimiter,
  validateGenerateRequest,
  async (req, res) => {
    const { path, project, instructions = '', sessionId } = req.body;
    console.log(`[api] generate: ${path} for ${project}`);

    try {
      // Single call — generates page. First page also establishes design system.
      const html = await geminiService.generatePage(
        sessionId.toString(), path, project, instructions
      );

      // After homepage, silently preload the other 4 nav pages in background
      if (path === '/') {
        geminiService.preloadPages(sessionId.toString(), project, instructions);
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error(`[error] generate failed for ${path}:`, error);
      res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generateErrorPage(error.message, project));
    }
  }
);

// Check if a page is cached (for silent preload polling)
router.get('/cached/:sessionId/:path(*)',
  (req, res) => {
    const { sessionId } = req.params;
    const path = '/' + (req.params.path || '');
    const session = geminiService.getSession(sessionId);
    const cacheKey = `${path}:${session.context.projectName}`;

    if (session.context.pageCache.has(cacheKey)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(session.context.pageCache.get(cacheKey));
    } else {
      res.status(404).json({ cached: false });
    }
  }
);

// Get session info
router.get('/session/:sessionId', (req, res) => {
  const sessionInfo = geminiService.getSessionInfo(req.params.sessionId);
  if (!sessionInfo) return res.status(404).json({ error: 'Session not found' });
  res.json({ sessionId: req.params.sessionId, ...sessionInfo });
});

function generateErrorPage(errorMessage, projectName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; background: #05080a; color: #c8d6e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .box { background: #0a1018; border-radius: 12px; border: 1px solid rgba(255,62,62,0.15); max-width: 500px; padding: 2rem; }
    h1 { color: #ff3e3e; font-size: 1.5rem; margin-bottom: 1rem; }
    .msg { background: #0f1923; border: 1px solid rgba(255,62,62,0.1); border-radius: 8px; padding: 1rem; font-size: 0.8rem; margin: 1rem 0; word-break: break-word; }
    .hint { background: rgba(0,255,157,0.05); border: 1px solid rgba(0,255,157,0.1); border-radius: 8px; padding: 1rem; color: #00ff9d; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>fabrication failed</h1>
    <p style="color:#4a6274">could not generate page for <strong style="color:#c8d6e5">${projectName}</strong></p>
    <div class="msg">${errorMessage}</div>
    <div class="hint">try refreshing or navigating to a different path.</div>
  </div>
</body>
</html>`;
}

module.exports = router;
