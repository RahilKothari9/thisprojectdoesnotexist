const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limit
const generalLimiter = createRateLimit(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again later.'
);

// Rate limit for site generation (each generates 6 Gemini calls)
const siteLimiter = createRateLimit(
  5 * 60 * 1000,
  3,
  'Too many site generation requests. Please wait before generating again.'
);

// Validation for generate-site endpoint
const validateSiteRequest = (req, res, next) => {
  const { project, sessionId } = req.body;

  if (!project || !sessionId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['project', 'sessionId']
    });
  }

  if (typeof project !== 'string' || project.trim().length === 0) {
    return res.status(400).json({
      error: 'Project name must be a non-empty string'
    });
  }

  if (typeof sessionId !== 'number' || sessionId <= 0) {
    return res.status(400).json({
      error: 'SessionId must be a positive number'
    });
  }

  req.body.project = project.trim();
  req.body.instructions = req.body.instructions ? req.body.instructions.trim() : '';

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('[error] API error:', err);

  if (err.message && err.message.includes('API key')) {
    return res.status(500).json({
      error: 'AI service configuration error',
      message: 'Please check API configuration'
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: err.message
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;

    const tag = status >= 400 ? 'ERR' : status >= 300 ? 'REDIR' : 'OK';
    console.log(`[${tag}] ${method} ${url} - ${status} - ${duration}ms - ${ip}`);
  });

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

module.exports = {
  generalLimiter,
  siteLimiter,
  validateSiteRequest,
  errorHandler,
  requestLogger,
  securityHeaders
};
