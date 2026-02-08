const express = require('express');
const GeminiService = require('../services/geminiService');
const { validateGenerationRequest, generationLimiter } = require('../middleware');

const router = express.Router();

// Initialize Gemini service
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ThisProjectDoesNotExist API',
    version: '1.0.0'
  });
});

// Generate page endpoint
router.post('/generate', 
  generationLimiter,
  validateGenerationRequest,
  async (req, res) => {
    try {
      const { 
        path, 
        project, 
        instructions = '', 
        prompt = '',
        sessionId 
      } = req.body;

      console.log(`� API Request: ${path} for ${project} (Session: ${sessionId})`);

      // Extract custom instructions from prompt if needed
      const customInstructions = instructions || '';

      // Generate the page
      const htmlContent = await geminiService.generatePage(
        sessionId.toString(),
        path,
        project,
        '', // Base instructions (handled in initialization)
        customInstructions
      );

      console.log(`📤 API Response: ${path} (${htmlContent.length} characters)`);

      // Return the HTML content directly
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error('❌ Generation failed:', error);
      
      // Return a fallback error page
      const errorHtml = generateErrorPage(error.message, req.body.project || 'Unknown Project');
      res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(errorHtml);
    }
  }
);

// Initialize session endpoint
router.post('/session/init',
  validateGenerationRequest,
  async (req, res) => {
    try {
      const { sessionId, project, instructions = '' } = req.body;
      
      console.log(`🔄 Initializing session ${sessionId} for project: ${project}`);
      
      const success = await geminiService.initializeSession(
        sessionId.toString(),
        project,
        instructions
      );

      if (success) {
        res.json({
          success: true,
          sessionId,
          project,
          message: 'Session initialized successfully'
        });
      } else {
        throw new Error('Failed to initialize session');
      }

    } catch (error) {
      console.error('❌ Session initialization failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize session',
        message: error.message
      });
    }
  }
);

// Get session info endpoint
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionInfo = geminiService.getSessionInfo(sessionId);

    if (!sessionInfo) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    res.json({
      sessionId,
      ...sessionInfo,
      status: 'active'
    });

  } catch (error) {
    console.error('❌ Failed to get session info:', error);
    res.status(500).json({
      error: 'Failed to retrieve session information'
    });
  }
});

// Generate fallback error page
function generateErrorPage(errorMessage, projectName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - ${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'IBM Plex Mono', monospace;
            background: #05080a;
            color: #c8d6e5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .error-container {
            background: #0a1018;
            border-radius: 12px;
            border: 1px solid rgba(255, 62, 62, 0.15);
            max-width: 500px;
            overflow: hidden;
        }
        .title-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-bottom: 1px solid rgba(255, 62, 62, 0.1);
            background: #0a1018;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot-red { background: rgba(255, 62, 62, 0.6); }
        .dot-yellow { background: rgba(255, 215, 0, 0.6); }
        .dot-green { background: rgba(0, 255, 157, 0.6); }
        .title-text { color: #4a6274; font-size: 12px; margin-left: 8px; }
        .content { padding: 2rem; }
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            color: #ff3e3e;
            margin-bottom: 1rem;
        }
        .error-msg {
            background: #0f1923;
            border: 1px solid rgba(255, 62, 62, 0.1);
            border-radius: 8px;
            padding: 1rem;
            font-size: 0.8rem;
            color: #c8d6e5;
            margin: 1rem 0;
            word-break: break-word;
        }
        .hint {
            background: rgba(0, 255, 157, 0.05);
            border: 1px solid rgba(0, 255, 157, 0.1);
            border-radius: 8px;
            padding: 1rem;
            color: #00ff9d;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="title-bar">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
            <span class="title-text">error.log</span>
        </div>
        <div class="content">
            <h1>fabrication failed</h1>
            <p style="color: #4a6274; margin-bottom: 1rem;">could not generate page for <strong style="color: #c8d6e5;">${projectName}</strong></p>
            <div class="error-msg">${errorMessage}</div>
            <div class="hint">try refreshing or navigating to a different path.</div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = router;
