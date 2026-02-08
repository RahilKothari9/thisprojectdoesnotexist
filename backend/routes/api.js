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
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generation Error - ${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0612 0%, #1a0a2e 100%);
            color: #e8dcc8;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .error-container {
            background: #1e1233;
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(139, 92, 246, 0.2);
            padding: 3rem;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .error-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #7c3aed, #8b5cf6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
        }

        .error-icon svg {
            width: 40px;
            height: 40px;
            color: white;
        }

        h1 {
            font-family: 'Cinzel', serif;
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #f0c75e;
        }

        .error-message {
            color: #e8dcc8;
            margin-bottom: 2rem;
            line-height: 1.6;
        }

        .error-message p code {
            background: #2a1845;
        }

        .retry-info {
            background: rgba(212, 168, 67, 0.1);
            border: 1px solid #d4a843;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 2rem;
        }

        .retry-info p {
            color: #d4a843;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
        </div>

        <h1>The Conjuration Failed</h1>

        <div class="error-message">
            <p>We encountered an issue while generating this page for <strong>${projectName}</strong>.</p>
            <p style="margin-top: 1rem; font-family: monospace; background: #2a1845; padding: 1rem; border-radius: 6px; font-size: 0.85rem;">
                ${errorMessage}
            </p>
        </div>

        <div class="retry-info">
            <p>The spirits may be resting. Try refreshing or conjuring a different page.</p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = router;
