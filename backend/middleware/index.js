const rateLimit = require('express-rate-limit');

// Rate limiting middleware
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
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limit for generation endpoint
const generationLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // limit each IP to 10 generation requests per 5 minutes
  'Too many page generation requests. Please wait before requesting more pages.'
);

// Validation middleware
const validateGenerationRequest = (req, res, next) => {
  const { path, project, sessionId } = req.body;

  // Validate required fields
  if (!path || !project || !sessionId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['path', 'project', 'sessionId']
    });
  }

  // Validate path format
  if (!path.startsWith('/')) {
    return res.status(400).json({
      error: 'Path must start with /'
    });
  }

  // Validate project name
  if (typeof project !== 'string' || project.trim().length === 0) {
    return res.status(400).json({
      error: 'Project name must be a non-empty string'
    });
  }

  // Validate sessionId
  if (typeof sessionId !== 'number' || sessionId <= 0) {
    return res.status(400).json({
      error: 'SessionId must be a positive number'
    });
  }

  // Sanitize inputs
  req.body.path = path.trim();
  req.body.project = project.trim();
  req.body.instructions = req.body.instructions ? req.body.instructions.trim() : '';
  req.body.prompt = req.body.prompt ? req.body.prompt.trim() : '';

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ API Error:', err);

  // Handle Gemini API errors
  if (err.message && err.message.includes('API key')) {
    return res.status(500).json({
      error: 'AI service configuration error',
      message: 'Please check API configuration'
    });
  }

  // Handle rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: err.message
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  // Default error response
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
    
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
    console.log(`${statusEmoji} ${method} ${url} - ${status} - ${duration}ms - ${ip}`);
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
  generationLimiter,
  validateGenerationRequest,
  errorHandler,
  requestLogger,
  securityHeaders
};
