const express = require('express');
const GeminiService = require('../services/geminiService');
const CerebrasService = require('../services/cerebrasService');
const { validateGenerateRequest, generationLimiter } = require('../middleware');

const router = express.Router();

// Initialize both providers
const gemini = new GeminiService(process.env.GEMINI_API_KEY);
const cerebras = new CerebrasService(process.env.CEREBRAS_API_KEY);

function getProvider(name) {
  if (name === 'cerebras') return cerebras;
  return gemini;
}

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get provider usage/limits
router.get('/providers', (req, res) => {
  const geminiLimits = gemini.getRateLimits();
  const cerebrasLimits = cerebras.getRateLimits();
  res.json({
    gemini: {
      id: 'gemini',
      name: 'Gemini',
      model: 'gemini-3.1-flash-lite-preview',
      available: !!process.env.GEMINI_API_KEY,
      usage: {
        requestsPerDay: geminiLimits.requestsPerDay,
        tokensPerMinute: geminiLimits.requestsPerMinute,
      },
    },
    cerebras: {
      id: 'cerebras',
      name: 'Cerebras',
      model: 'qwen-3-235b',
      available: !!process.env.CEREBRAS_API_KEY,
      usage: {
        requestsPerDay: cerebrasLimits.requestsPerDay,
        tokensPerMinute: cerebrasLimits.tokensPerMinute,
      },
    }
  });
});

// Generate a single page
router.post('/generate',
  generationLimiter,
  validateGenerateRequest,
  async (req, res) => {
    const { path, project, instructions = '', sessionId, provider = 'gemini' } = req.body;
    console.log(`[api] generate: ${path} for ${project} via ${provider}`);

    const service = getProvider(provider);

    try {
      const html = await service.generatePage(
        sessionId.toString(), path, project, instructions
      );

      // After homepage, silently preload
      if (path === '/') {
        service.preloadPages(sessionId.toString(), project, instructions);
      }

      // Return usage info in response header
      const service_ref = provider === 'cerebras' ? cerebras : gemini;
      res.setHeader('X-Provider-Usage', JSON.stringify(service_ref.getRateLimits()));

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error(`[error] generate failed for ${path} via ${provider}:`, error.message);

      // If rate limited, return usage info so frontend can update
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        const limits = service.getRateLimits();
        return res.status(429).json({
          error: 'Rate limit exceeded',
          provider,
          usage: limits,
        });
      }

      res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generateErrorPage(error.message, project));
    }
  }
);

// Get session info
router.get('/session/:sessionId', (req, res) => {
  // Try both providers
  const info = gemini.getSessionInfo(req.params.sessionId)
    || cerebras.getSessionInfo(req.params.sessionId);
  if (!info) return res.status(404).json({ error: 'Session not found' });
  res.json({ sessionId: req.params.sessionId, ...info });
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
