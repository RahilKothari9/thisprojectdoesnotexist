const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const generalLimiter = createRateLimit(
  15 * 60 * 1000, 100,
  'Too many requests from this IP, please try again later.'
);

const generationLimiter = createRateLimit(
  5 * 60 * 1000, 20,
  'Too many page generation requests. Please wait before requesting more pages.'
);

const validateGenerateRequest = (req, res, next) => {
  const { path, project, sessionId } = req.body;

  if (!path || !project || !sessionId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['path', 'project', 'sessionId']
    });
  }

  if (!path.startsWith('/')) {
    return res.status(400).json({ error: 'Path must start with /' });
  }

  if (typeof project !== 'string' || project.trim().length === 0) {
    return res.status(400).json({ error: 'Project name must be a non-empty string' });
  }

  if (typeof sessionId !== 'number' || sessionId <= 0) {
    return res.status(400).json({ error: 'SessionId must be a positive number' });
  }

  req.body.path = path.trim();
  req.body.project = project.trim();
  req.body.instructions = req.body.instructions ? req.body.instructions.trim() : '';

  next();
};

const errorHandler = (err, req, res, next) => {
  console.error('[error] API error:', err);
  if (err.status === 429) {
    return res.status(429).json({ error: 'Rate limit exceeded', message: err.message });
  }
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const tag = res.statusCode >= 400 ? 'ERR' : 'OK';
    console.log(`[${tag}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
};

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
  validateGenerateRequest,
  errorHandler,
  requestLogger,
  securityHeaders
};
