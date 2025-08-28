# Security Notice

## ⚠️ Important: API Key Security

This project requires a Google Gemini API key to function. **NEVER commit your actual API key to version control.**

### Setup Instructions

1. Copy `backend/.env.example` to `backend/.env`
2. Replace the placeholder API key with your actual key
3. The `.env` file is automatically ignored by git

### API Key Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy it to your `backend/.env` file:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### What's Protected

- ✅ `backend/.env` - Ignored by git
- ✅ `backend/.env.local` - Ignored by git
- ✅ All `.env*` files - Ignored by git
- ✅ `node_modules/` - Ignored by git

### Rate Limiting

The application includes built-in rate limiting to protect against API abuse:
- General API: 100 requests per 15 minutes
- Page Generation: 10 requests per 5 minutes

### Production Deployment

When deploying to production:
1. Set environment variables through your hosting platform
2. Never hardcode API keys in source code
3. Use HTTPS in production
4. Configure CORS for your production domain

## 🛡️ Security Features

- Input validation and sanitization
- CORS protection
- Security headers (XSS protection, etc.)
- Rate limiting
- Error message filtering in production

---

**Keep your API keys secure! 🔐**
