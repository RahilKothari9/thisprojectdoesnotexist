const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor(apiKey) {
    // Initialize the new GoogleGenAI client
    this.genAI = new GoogleGenAI({
      apiKey: apiKey
    });
    this.sessions = new Map(); // Store session contexts
    console.log('🤖 GeminiService initialized with new @google/genai SDK');
  }

  // Get or create a chat session for the given sessionId
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      // Initialize session context without pre-creating chat
      this.sessions.set(sessionId, {
        context: {
          projectName: '',
          baseInstructions: '',
          generatedPages: [],
          pageCache: new Map(), // Add page caching
          sessionStartTime: new Date(),
          chatHistory: [] // Store conversation history for context
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  // Initialize session with project context
  async initializeSession(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    session.context.projectName = projectName;
    session.context.baseInstructions = instructions;

    const initPrompt = this.buildInitializationPrompt(projectName, instructions);
    
    try {
      // Use the new API to send initialization message
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: initPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disable thinking for faster responses
          },
          maxOutputTokens: 100, // Short response for initialization
          temperature: 0.7,
        }
      });
      
      // Store the initialization in chat history
      session.context.chatHistory.push({
        role: 'user',
        content: initPrompt
      });
      session.context.chatHistory.push({
        role: 'assistant', 
        content: response.text
      });
      
      console.log(`✅ Session ${sessionId} initialized for project: ${projectName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize session ${sessionId}:`, error);
      return false;
    }
  }

  // Generate a page for the given path
  async generatePage(sessionId, path, projectName, instructions, customInstructions = '') {
    const session = this.getSession(sessionId);
    
    // Check backend cache first
    const cacheKey = `${path}:${JSON.stringify({ projectName, instructions, customInstructions })}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`🚀 Returning cached page: ${path} for project: ${projectName} (Session: ${sessionId})`);
      return session.context.pageCache.get(cacheKey);
    }
    
    // Update session context if needed
    if (session.context.projectName !== projectName) {
      await this.initializeSession(sessionId, projectName, instructions);
    }

    const pagePrompt = this.buildPagePrompt(
      path, 
      projectName, 
      instructions, 
      customInstructions,
      session.context.generatedPages
    );

    try {
      console.log(`🔄 Generating page: ${path} for project: ${projectName}`);
      
      // Build contents array with limited chat history for context
      // Only include the last 2 exchanges to maintain consistency without overwhelming context
      const recentHistory = session.context.chatHistory.slice(-4); // Last 4 messages (2 exchanges)
      
      const contents = [
        ...recentHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: pagePrompt }]
        }
      ];
      
      // Use the new API to generate content
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: contents,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disable thinking for faster responses
          },
          maxOutputTokens: 4096, // Reduced from 8192 for faster generation
          temperature: 0.9, // Higher temperature for faster, more creative responses
        }
      });
      
      const rawContent = response.text;
      console.log(`📝 Raw AI response length: ${rawContent.length} characters`);
      
      // Store generated page in context
      session.context.generatedPages.push({
        path,
        generatedAt: new Date(),
        instructions: customInstructions
      });

      // Update chat history
      session.context.chatHistory.push({
        role: 'user',
        content: pagePrompt
      });
      session.context.chatHistory.push({
        role: 'assistant',
        content: rawContent
      });

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);
      console.log(`✅ Successfully generated and validated HTML for ${path}`);
      
      // Cache the result
      session.context.pageCache.set(cacheKey, cleanedHTML);
      console.log(`💾 Cached page: ${path} (${cleanedHTML.length} characters)`);
      
      return cleanedHTML;
    } catch (error) {
      console.error(`❌ Failed to generate page for ${path}:`, error);
      throw error;
    }
  }

  // Build initialization prompt for new sessions
  buildInitializationPrompt(projectName, instructions) {
    return `Create a professional website for "${projectName}". 

REQUIREMENTS:
- IDENTICAL styling across ALL pages
- NO images/logos - use CSS/Unicode only
- Same navigation menu everywhere
- ALL LINKS must use RELATIVE PATHS ONLY (e.g., href="/about", href="/contact")
- NEVER use target="_blank" or target="_new" or window.open()
- NO external links or absolute URLs
- Include navigation JavaScript:

<script>
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.href) {
    const url = new URL(link.href);
    if (url.pathname !== window.location.pathname) {
      e.preventDefault();
      window.parent.postMessage({type: 'navigate', path: url.pathname}, '*');
    }
  }
});
</script>

TEMPLATE:
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>/* CSS here */</style>
</head><body>
<!-- Content -->
<script>/* navigation script */</script>
</body></html>

Respond "Ready" to confirm.`;
  }

  // Build prompt for specific page generation
  buildPagePrompt(path, projectName, baseInstructions, customInstructions, generatedPages) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');
    
    return `Generate ${pageName} for "${projectName}" at ${path}

REQUIREMENTS:
- IDENTICAL styling to previous pages
- NO images - CSS/Unicode only
- Same navigation menu
- Professional content
- ALL LINKS must use RELATIVE PATHS ONLY (e.g., href="/about", href="/contact")
- NEVER use target="_blank" or target="_new" or window.open()
- NO external links or absolute URLs
- Must include navigation script before </body>

TEMPLATE:
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>/* Consistent CSS */</style>
</head><body>
<!-- Page content -->
<script>
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.href) {
    const url = new URL(link.href);
    if (url.pathname !== window.location.pathname) {
      e.preventDefault();
      window.parent.postMessage({type: 'navigate', path: url.pathname}, '*');
    }
  }
});
</script>
</body></html>

Generate complete HTML now:`;
  }

  // Clean and validate HTML output
  cleanAndValidateHTML(htmlContent) {
    console.log(`🔍 Validating HTML content...`);
    
    // Log the first 200 characters to see what we got
    console.log(`📋 First 200 chars of response: "${htmlContent.substring(0, 200)}..."`);
    
    // Remove any markdown code blocks if present
    let cleaned = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any explanatory text before or after HTML
    const doctypeIndex = cleaned.indexOf('<!DOCTYPE');
    if (doctypeIndex > 0) {
      console.log(`⚠️ Removing ${doctypeIndex} chars before DOCTYPE`);
      cleaned = cleaned.substring(doctypeIndex);
    }
    
    // Find the end of HTML and cut off any trailing text
    const htmlEndIndex = cleaned.lastIndexOf('</html>');
    if (htmlEndIndex > 0) {
      cleaned = cleaned.substring(0, htmlEndIndex + 7); // +7 for </html>
    }

    // Ensure it starts with DOCTYPE
    if (!cleaned.trim().startsWith('<!DOCTYPE')) {
      console.warn('⚠️ Generated content missing DOCTYPE, adding...');
      cleaned = '<!DOCTYPE html>\n' + cleaned;
    }

    // Enhanced validation
    if (!cleaned.includes('<html')) {
      console.error('❌ VALIDATION FAILED: No <html> tag found');
      console.error('📄 Problematic content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing <html> tag');
    }
    
    if (!cleaned.includes('</html>')) {
      console.error('❌ VALIDATION FAILED: No closing </html> tag found');
      console.error('📄 Problematic content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing closing </html> tag');
    }

    if (!cleaned.includes('<head>') || !cleaned.includes('</head>')) {
      console.error('❌ VALIDATION FAILED: Missing head section');
      console.error('📄 Problematic content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing head section');
    }

    if (!cleaned.includes('<body>') || !cleaned.includes('</body>')) {
      console.error('❌ VALIDATION FAILED: Missing body section');
      console.error('📄 Problematic content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing body section');
    }

    console.log(`✅ HTML validation passed - ${cleaned.length} characters`);
    return cleaned.trim();
  }

  // Clean up old sessions (call periodically)
  cleanupSessions(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.context.sessionStartTime > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  // Get session info
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      projectName: session.context.projectName,
      generatedPages: session.context.generatedPages.length,
      sessionAge: new Date() - session.context.sessionStartTime,
      lastActivity: session.context.generatedPages.length > 0 
        ? session.context.generatedPages[session.context.generatedPages.length - 1].generatedAt 
        : session.context.sessionStartTime
    };
  }
}

module.exports = GeminiService;
