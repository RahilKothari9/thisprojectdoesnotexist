# ThisProjectDoesNotExist

🚀 **AI-Powered Instant Website Mockup Generator**

Generate complete, professional website mockups in seconds using Google Gemini AI. Perfect for rapid prototyping, client presentations, and creative ideation.

![Project Demo](https://img.shields.io/badge/Status-Ready-brightgreen) ![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-blue) ![Tech Stack](https://img.shields.io/badge/Tech-React%20%7C%20TypeScript%20%7C%20Node.js-orange)

## ✨ Features

- 🎨 **Instant Page Generation** - Create realistic web pages from any URL path
- 🧠 **Context-Aware AI** - Maintains project context across the entire session
- 🎯 **Custom Instructions** - Fine-tune generation with real-time instructions
- 📱 **Fully Responsive** - All generated pages are mobile-ready
- 🎭 **Professional Design** - Modern, clean aesthetics with consistent branding
- ⚡ **Real-time Generation** - Fast API responses with smart caching
- 🔒 **Secure & Scalable** - Rate limiting, validation, and production-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/thisprojectdoesnotexist.git
   cd thisprojectdoesnotexist
   ```

2. **Setup Frontend**
   ```bash
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

4. **Configure API Key**
   
   Edit `backend/.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

5. **Start Development Servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Visit `http://localhost:5173` and start creating!

## 🏗️ Architecture

```
thisprojectdoesnotexist/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── utils/             # Utility functions
│   └── ...
├── backend/               # Express.js backend
│   ├── services/          # AI service integration
│   ├── routes/            # API endpoints
│   ├── middleware/        # Custom middleware
│   └── server.js          # Main server file
└── README.md             # You are here!
```

## 🔧 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v4** for styling
- **shadcn/ui** components
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **Google Gemini AI** for page generation
- **Session management** for context persistence
- **Rate limiting** and security middleware
- **Comprehensive error handling**

## 📖 Usage

1. **Start a Project**: Enter your project name and requirements
2. **Generate Pages**: Navigate to any URL (e.g., `/about`, `/pricing`, `/dashboard`)
3. **Customize**: Use the sidebar to add specific instructions
4. **Iterate**: Visit different URLs to build a complete site mockup
5. **Export**: End your session to download the generated content

### Example URLs to Try
- `/` - Homepage with hero section
- `/about` - About page with company info
- `/pricing` - Pricing tables and plans
- `/features` - Feature showcase
- `/dashboard` - Admin dashboard layout
- `/contact` - Contact form and info

## 🔑 API Endpoints

### Core Endpoints
- `POST /api/generate` - Generate a page for a specific URL path
- `POST /api/session/init` - Initialize a new session with project context
- `GET /api/session/:sessionId` - Get session information
- `GET /api/health` - Health check

### Example API Usage
```javascript
// Generate a page
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: '/pricing',
    project: 'My SaaS App',
    instructions: 'Include 3 tiers with annual discounts',
    sessionId: Date.now()
  })
});
```

## ⚙️ Configuration

### Environment Variables

**Backend (.env)**
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Rate Limiting
- General API: 100 requests per 15 minutes
- Page Generation: 10 requests per 5 minutes

## � Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables for API endpoints

### Backend (Railway/Heroku/VPS)
1. Deploy the `backend` folder
2. Set environment variables
3. Ensure CORS is configured for your frontend domain

### Docker (Optional)
```dockerfile
# Dockerfile example coming soon
```

## 🛡️ Security Features

- **Input Validation**: All inputs are sanitized and validated
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configured for your domain
- **Security Headers**: XSS protection, content sniffing prevention
- **Error Handling**: No sensitive information leaked in errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Google Gemini AI](https://makersuite.google.com/)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express.js](https://expressjs.com/)

## 💡 Inspiration

Inspired by "This Person Does Not Exist" and similar AI-powered generators, this project demonstrates the power of AI in creative web development and rapid prototyping.

---

**Built with ❤️ and AI**

*Generate. Iterate. Create.*

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 with custom animations
- **UI Components**: shadcn/ui components
- **Routing**: React Router DOM for dynamic navigation
- **AI Integration**: Ready for LLM backend integration

## 🚀 Getting Started

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd thisprojectdoesnotexist
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Open Browser**: Navigate to `http://localhost:5173`

4. **Create Your Project**:
   - Watch the name spinner generate suggestions
   - Enter your project name or use a generated one
   - Add optional instructions to guide the AI
   - Click "Generate My Project" to begin

## 🎮 How to Use

### 1. **Project Setup**
- The landing page shows an animated project name generator
- You can use the suggested name or enter your own
- Optional instructions help the AI understand your vision
- More specific instructions yield better, more tailored results

### 2. **Explore Your Project**
- After setup, you'll see your AI-generated homepage
- Navigate to any URL to create new pages:
  - `/dashboard` - Project management interface
  - `/features` - Feature showcase page
  - `/about` - About page for your project
  - `/contact` - Contact information page
  - Or any custom path like `/api`, `/docs`, `/admin`

### 3. **Session Management**
- All pages are cached for fast re-visits
- Your session contains all generated content
- No data is permanently stored on servers
- Everything exists only during your browser session

### 4. **Download Your Project**
- Visit `/end` to conclude your session
- Download options include:
  - **All HTML Pages**: Complete static website files
  - **AI Generation Log**: See how the AI created your project
  - **Session Data**: Full metadata and creation history
- Start a new session anytime with the "Start New Project" button

## 🏗 Project Structure

```
src/
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── textarea.tsx
│   ├── InitialSetup.tsx         # Enhanced project setup screen
│   └── DynamicPageRenderer.tsx  # AI-powered page generator
├── utils/
│   └── nameGenerator.ts         # Random project name generator
├── lib/
│   └── utils.ts                # shadcn/ui utilities
└── App.tsx                     # Main application with routing
```

## 🤖 AI Integration

The application is designed to integrate with AI/LLM backends:

### **Current Implementation**
- Fallback content generation for demonstration
- Beautiful, contextual page designs
- Project-aware content creation

### **Backend Integration Ready**
- POST `/api/generate` endpoint for LLM integration
- Session-based context management
- Prompt engineering for consistent project generation
- Error handling with graceful fallbacks

### **Example API Request**
```json
{
  "path": "/dashboard",
  "project": "Digital Analyzer",
  "instructions": "Create a data analytics platform",
  "prompt": "Generate a dashboard page for project 'Digital Analyzer'...",
  "sessionId": "1640995200000"
}
```

## 🎨 Design Philosophy

### **User Experience**
- **Instant Gratification**: See results immediately
- **Exploration-Driven**: Encourage users to discover by browsing
- **No Commitment**: Session-based, no permanent storage
- **Export Freedom**: Take your work with you

### **AI-First Approach**
- **Context Awareness**: AI understands project scope
- **Consistency**: Maintained visual and functional coherence
- **Adaptability**: Content adapts to different page types
- **Transparency**: Users can see AI generation process

## 🔮 Future Enhancements

- **Real LLM Integration**: Connect with OpenAI, Claude, or other AI services
- **Advanced Templates**: Industry-specific project templates
- **Code Generation**: Generate actual functional components, not just HTML
- **Collaboration**: Share sessions with team members
- **Export Formats**: Support for React, Vue, Angular project exports
- **Version Control**: Track iterations and improvements

## 🤝 Contributing

This is an open-source demonstration of AI-powered development tools. Contributions welcome!

## 📄 License

MIT License - Build amazing things with AI!

---

**ThisProjectDoesNotExist** - *Where imagination meets artificial intelligence* ✨

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
