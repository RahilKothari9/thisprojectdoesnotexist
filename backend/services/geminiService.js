const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenAI({
      apiKey: apiKey
    });
    this.sessions = new Map();
    console.log('[gemini] service initialized');
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        context: {
          projectName: '',
          baseInstructions: '',
          generatedPages: [],
          pageCache: new Map(),
          sessionStartTime: new Date(),
          chatHistory: []
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  async initializeSession(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    session.context.projectName = projectName;
    session.context.baseInstructions = instructions;

    const initPrompt = this.buildInitializationPrompt(projectName, instructions);

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: initPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          maxOutputTokens: 100,
          temperature: 0.7,
        }
      });

      session.context.chatHistory.push({
        role: 'user',
        content: initPrompt
      });
      session.context.chatHistory.push({
        role: 'assistant',
        content: response.text
      });

      console.log(`[session] ${sessionId} initialized for: ${projectName}`);
      return true;
    } catch (error) {
      console.error(`[error] failed to init session ${sessionId}:`, error);
      return false;
    }
  }

  async generatePage(sessionId, path, projectName, instructions, customInstructions = '') {
    const session = this.getSession(sessionId);

    const cacheKey = `${path}:${JSON.stringify({ projectName, instructions, customInstructions })}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`[cache] hit: ${path} for ${projectName}`);
      return session.context.pageCache.get(cacheKey);
    }

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
      console.log(`[generate] ${path} for ${projectName}`);

      const recentHistory = session.context.chatHistory.slice(-4);

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

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: contents,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          maxOutputTokens: 4096,
          temperature: 0.8,
        }
      });

      const rawContent = response.text;
      console.log(`[response] ${rawContent.length} chars`);

      session.context.generatedPages.push({
        path,
        generatedAt: new Date(),
        instructions: customInstructions
      });

      session.context.chatHistory.push({
        role: 'user',
        content: pagePrompt
      });
      session.context.chatHistory.push({
        role: 'assistant',
        content: rawContent
      });

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);
      console.log(`[ok] validated HTML for ${path}`);

      session.context.pageCache.set(cacheKey, cleanedHTML);
      console.log(`[cache] stored: ${path} (${cleanedHTML.length} chars)`);

      return cleanedHTML;
    } catch (error) {
      console.error(`[error] generation failed for ${path}:`, error);
      throw error;
    }
  }

  buildInitializationPrompt(projectName, instructions) {
    return `Create a website for "${projectName}".${instructions ? ` ${instructions}` : ''}

RULES:
- Pick a distinctive Google Font pairing (never Inter/Roboto/Arial). Bold colors, not bland.
- No images, no emojis. Use CSS/SVG/Unicode only.
- Real content, not lorem ipsum.
- IDENTICAL styling across ALL pages. Same nav linking: /, /about, /features, /pricing, /contact
- ALL links RELATIVE PATHS ONLY. NEVER target="_blank" or window.open()
- Include before </body>:
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

Return ONLY complete HTML. No markdown. Start <!DOCTYPE html>, end </html>.
Respond "Ready".`;
  }

  buildPagePrompt(path, projectName, baseInstructions, customInstructions, generatedPages) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');

    return `Generate ${pageName} for "${projectName}" at ${path}
${customInstructions ? `Instructions: ${customInstructions}` : ''}

RULES:
- IDENTICAL styling to previous pages. Same fonts, colors, nav, footer.
- No images, no emojis. CSS/SVG/Unicode only. Real content, not placeholder.
- Same nav: /, /about, /features, /pricing, /contact. Highlight active page.
- ALL links RELATIVE PATHS ONLY. NEVER target="_blank" or window.open()
- Include before </body>:
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

Return ONLY complete HTML. No markdown. Start <!DOCTYPE html>, end </html>.
Generate now:`;
  }

  cleanAndValidateHTML(htmlContent) {
    console.log('[validate] checking HTML content...');
    console.log(`[validate] first 200 chars: "${htmlContent.substring(0, 200)}..."`);

    let cleaned = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    const doctypeIndex = cleaned.indexOf('<!DOCTYPE');
    if (doctypeIndex > 0) {
      console.log(`[validate] trimming ${doctypeIndex} chars before DOCTYPE`);
      cleaned = cleaned.substring(doctypeIndex);
    }

    const htmlEndIndex = cleaned.lastIndexOf('</html>');
    if (htmlEndIndex > 0) {
      cleaned = cleaned.substring(0, htmlEndIndex + 7);
    }

    if (!cleaned.trim().startsWith('<!DOCTYPE')) {
      console.warn('[validate] missing DOCTYPE, adding...');
      cleaned = '<!DOCTYPE html>\n' + cleaned;
    }

    if (!cleaned.includes('<html')) {
      console.error('[validate] FAIL: no <html> tag');
      console.error('[validate] content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing <html> tag');
    }

    if (!cleaned.includes('</html>')) {
      console.error('[validate] FAIL: no closing </html> tag');
      console.error('[validate] content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing closing </html> tag');
    }

    if (!cleaned.includes('<head>') || !cleaned.includes('</head>')) {
      console.error('[validate] FAIL: missing head section');
      console.error('[validate] content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing head section');
    }

    if (!cleaned.includes('<body>') || !cleaned.includes('</body>')) {
      console.error('[validate] FAIL: missing body section');
      console.error('[validate] content:', cleaned.substring(0, 500));
      throw new Error('Generated content is missing body section');
    }

    console.log(`[validate] passed - ${cleaned.length} chars`);
    return cleaned.trim();
  }

  cleanupSessions(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.context.sessionStartTime > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`[cleanup] expired session: ${sessionId}`);
      }
    }
  }

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
