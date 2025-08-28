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
      
      // Build contents array with chat history for context
      const contents = [
        ...session.context.chatHistory.map(msg => ({
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
          maxOutputTokens: 8192,
          temperature: 0.7,
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
    return `You are an expert web developer creating a professional website for "${projectName}".

PROJECT CONTEXT:
- Project Name: ${projectName}
- User Instructions: ${instructions || 'Create a modern, professional website'}

YOUR ROLE:
You have complete creative freedom to design and build this website. Use your expertise to create compelling, realistic pages that make sense for this project. Each page should feel authentic and professional.

CRITICAL CONSISTENCY REQUIREMENTS:
1. MAINTAIN IDENTICAL STYLING across ALL pages - same colors, fonts, spacing, layout structure
2. NEVER use images, logos, photos, or any external media files - they won't exist
3. Use CSS-only design elements: gradients, borders, shadows, geometric shapes, icons from CSS/Unicode
4. Keep the EXACT same navigation menu on every page
5. Use the SAME color scheme, typography, and design patterns throughout
6. Maintain consistent header/footer structure across all pages

TECHNICAL GUIDELINES (CRITICAL FOR RENDERING):
1. ALWAYS respond with ONLY valid HTML - no explanations, no markdown, no extra text
2. Include ALL CSS in <style> tags within the <head> section
3. Start every response with <!DOCTYPE html>
4. Use proper HTML5 structure with semantic elements
5. Make pages fully responsive and modern
6. Include realistic content - no placeholders or Lorem ipsum
7. Create logical navigation between pages
8. Ensure cross-browser compatibility
9. CRITICAL: Add navigation JavaScript to handle link clicks properly

NAVIGATION REQUIREMENTS:
- All internal links must use relative paths (e.g., "/about", "/features")
- Include JavaScript that intercepts link clicks and sends navigation messages
- Add this exact JavaScript before closing </body> tag:

<script>
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.href) {
    const url = new URL(link.href);
    if (url.pathname !== window.location.pathname) {
      e.preventDefault();
      window.parent.postMessage({
        type: 'navigate',
        path: url.pathname
      }, '*');
    }
  }
});
</script>

DESIGN CONSTRAINTS:
- NO images, logos, photos, or external media files
- NO <img> tags or background-image CSS properties
- Use CSS shapes, gradients, and Unicode symbols instead
- Create visual interest with typography, spacing, and CSS effects
- Build cohesive brand identity through consistent styling only

CREATIVE FREEDOM (within constraints):
- Design the website however you think best represents the project
- Choose appropriate colors, fonts, and layouts (but keep them consistent)
- Create realistic business content and features
- Interpret abstract URLs creatively as business concepts
- Build a cohesive brand experience through design consistency

Remember: You will generate multiple pages for this project. ABSOLUTE consistency in design, branding, navigation, and styling is critical. Be creative but maintain strict visual consistency.

Respond with "Session initialized" to confirm you understand.`;
  }

  // Build prompt for specific page generation
  buildPagePrompt(path, projectName, baseInstructions, customInstructions, generatedPages) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');
    
    const previousPagesContext = generatedPages.length > 0 
      ? `\nPREVIOUSLY GENERATED PAGES:\n${generatedPages.map(p => `- ${p.path} (generated ${p.generatedAt.toLocaleString()})`).join('\n')}`
      : '\nThis is the first page for this project.';

    return `Generate a complete webpage for "${projectName}" at path: ${path}

PROJECT CONTEXT:
- Project Name: ${projectName}
- URL Path: ${path} (${pageName})
- User's Instructions: ${baseInstructions || 'Create a professional website'}
- Additional Context: ${customInstructions || 'None provided'}
${previousPagesContext}

CONTEXT FOR THIS PAGE:
You are building page "${pageName}" for the project "${projectName}". Use your web development expertise to create an appropriate page that fits this URL and project. Be creative in interpreting what this page should contain.

CRITICAL CONSISTENCY REQUIREMENTS:
1. Use IDENTICAL styling to previous pages - same colors, fonts, navigation, layout structure
2. NEVER include images, logos, photos, or any media files - use CSS-only design
3. Keep the EXACT same navigation menu structure and styling
4. Maintain consistent header/footer across all pages
5. Use the same color palette, typography, and spacing throughout
6. Create visual elements using CSS gradients, shapes, borders, shadows only

CRITICAL RENDERING REQUIREMENTS:
1. Respond with ONLY the complete HTML document - no explanations
2. Start with <!DOCTYPE html>
3. Include ALL CSS in <style> tags within <head>
4. Create realistic, professional content (no placeholders)
5. Make it fully responsive and modern
6. Include proper navigation to other logical pages
7. Ensure the HTML is valid and will render correctly
8. NO <img> tags or background-image properties - use CSS-only visuals
9. CRITICAL: Add navigation JavaScript before closing </body> tag

NAVIGATION JAVASCRIPT (MUST INCLUDE):
Add this exact script before </body>:

<script>
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.href) {
    const url = new URL(link.href);
    if (url.pathname !== window.location.pathname) {
      e.preventDefault();
      window.parent.postMessage({
        type: 'navigate',
        path: url.pathname
      }, '*');
    }
  }
});
</script>

DESIGN CONSISTENCY CHECKLIST:
- Same navigation menu on every page
- Identical color scheme and typography
- Consistent spacing and layout patterns
- Same header/footer structure
- Visual consistency through CSS-only elements

Generate the complete HTML page now:`;
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
