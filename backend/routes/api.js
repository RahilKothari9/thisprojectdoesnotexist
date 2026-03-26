const express = require('express');
const GeminiService = require('../services/geminiService');
const { validateSiteRequest, siteLimiter } = require('../middleware');

const router = express.Router();

const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ThisProjectDoesNotExist API',
    version: '2.0.0'
  });
});

// Generate entire site via SSE
router.post('/generate-site',
  siteLimiter,
  validateSiteRequest,
  async (req, res) => {
    const { project, instructions = '', sessionId } = req.body;
    console.log(`[api] generate-site: ${project} (session: ${sessionId})`);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      // Flush for Vercel streaming support
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Handle client disconnect
    let aborted = false;
    req.on('close', () => {
      aborted = true;
      console.log(`[api] client disconnected: ${project}`);
    });

    try {
      const startTime = Date.now();

      // 55s timeout — send clean error before Vercel's 60s hard kill
      const timeoutId = setTimeout(() => {
        if (!aborted) {
          sendEvent('error', { phase: 'timeout', message: 'Generation timed out after 55 seconds' });
          sendEvent('done', { totalPages: 0, totalRequested: 5 });
          res.end();
          aborted = true;
        }
      }, 55000);

      await geminiService.generateSite(
        sessionId.toString(),
        project,
        instructions,
        (event) => {
          if (aborted) return;
          sendEvent(event.type, event);
        }
      );

      clearTimeout(timeoutId);

      if (!aborted) {
        const elapsed = Date.now() - startTime;
        console.log(`[api] site complete: ${project} (${elapsed}ms)`);
        res.end();
      }
    } catch (error) {
      console.error('[error] site generation failed:', error);
      if (!aborted) {
        sendEvent('error', { phase: 'unknown', message: error.message });
        res.end();
      }
    }
  }
);

// Get session info endpoint
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionInfo = geminiService.getSessionInfo(sessionId);

    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found', sessionId });
    }

    res.json({ sessionId, ...sessionInfo, status: 'active' });
  } catch (error) {
    console.error('[error] failed to get session info:', error);
    res.status(500).json({ error: 'Failed to retrieve session information' });
  }
});

module.exports = router;
