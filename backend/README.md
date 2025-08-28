# ThisProjectDoesNotExist Backend

AI-powered dynamic page generation service using Google Gemini AI.

## Quick Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Get Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy it to your `.env` file

4. **Start the Server**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Required |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## API Endpoints

### Health Check
```
GET /api/health
```

### Generate Page
```
POST /api/generate
{
  "path": "/about",
  "project": "My Project",
  "instructions": "Make it professional",
  "sessionId": 1234567890
}
```

### Initialize Session
```
POST /api/session/init
{
  "sessionId": 1234567890,
  "project": "My Project", 
  "instructions": "Base project requirements"
}
```

### Get Session Info
```
GET /api/session/:sessionId
```

## Features

- 🤖 **Gemini AI Integration** - Advanced page generation
- 🧠 **Session Context** - Maintains project context across requests
- 🔒 **Security** - Rate limiting, validation, security headers
- 📊 **Logging** - Comprehensive request logging
- 🚀 **Performance** - Compression and optimized responses
- 🔄 **Error Handling** - Graceful error responses with fallback pages

## Development

```bash
# Start with nodemon for auto-reload
npm run dev

# Start production server
npm start
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper `FRONTEND_URL`
3. Set up reverse proxy (nginx/Apache)
4. Enable HTTPS
5. Configure rate limiting based on your needs

## Security Features

- Helmet.js security headers
- CORS protection
- Rate limiting (100 requests/15min general, 10 requests/5min for generation)
- Input validation and sanitization
- Error message filtering in production

## Troubleshooting

### Common Issues

1. **Missing API Key Error**
   - Ensure `GEMINI_API_KEY` is set in `.env`
   - Verify the API key is valid

2. **CORS Errors**
   - Check `FRONTEND_URL` in `.env`
   - Ensure frontend is running on the correct port

3. **Rate Limiting**
   - Reduce request frequency
   - Check rate limit configuration in middleware

4. **Port Already in Use**
   - Change `PORT` in `.env`
   - Kill existing processes on the port

### Logs

The server provides detailed logging:
- ✅ Successful requests
- ⚠️ Warnings and redirects  
- ❌ Errors and failures
- 🚀 Page generation starts
- 🧹 Session cleanup

## Architecture

```
backend/
├── server.js              # Main server file
├── routes/
│   └── api.js             # API route handlers
├── services/
│   └── geminiService.js   # Gemini AI integration
├── middleware/
│   └── index.js           # Custom middleware
└── package.json           # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
