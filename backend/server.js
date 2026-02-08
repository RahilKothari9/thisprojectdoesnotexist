require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const apiRoutes = require('./routes/api');
const { 
  generalLimiter, 
  errorHandler, 
  requestLogger, 
  securityHeaders 
} = require('./middleware');

// Validate environment variables
if (!process.env.GEMINI_API_KEY) {
  console.warn('[warn] GEMINI_API_KEY is not set. AI generation will fail until configured.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles for generated HTML
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(requestLogger);
app.use(securityHeaders);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://thisprojectdoesnotexist-7qu9gav0v-rahilkothari9s-projects.vercel.app',
  'https://thisprojectdoesnotexist.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    )) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ThisProjectDoesNotExist API',
    version: '1.0.0',
    description: 'AI-powered dynamic page generation service',
    endpoints: {
      health: '/api/health',
      generate: 'POST /api/generate',
      sessionInit: 'POST /api/session/init',
      sessionInfo: 'GET /api/session/:sessionId'
    },
    documentation: 'https://github.com/your-repo/thisprojectdoesnotexist',
    status: 'operational'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down...');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log('[server] ThisProjectDoesNotExist');
  console.log(`[server] port: ${PORT}`);
  console.log(`[server] env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] api: http://localhost:${PORT}/api`);
  console.log(`[server] frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`[server] gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'MISSING API KEY'}`);
  console.log('[server] ready');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[error] port ${PORT} is already in use`);
  } else {
    console.error('[error] server error:', error);
  }
  process.exit(1);
});

module.exports = app;
