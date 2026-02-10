const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenAI({ apiKey });
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
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  async initializeSession(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    session.context.projectName = projectName;
    session.context.baseInstructions = instructions;
    console.log(`[session] ${sessionId} initialized for: ${projectName}`);
    return true;
  }

  async generatePage(sessionId, path, projectName, instructions, customInstructions = '') {
    const session = this.getSession(sessionId);

    const cacheKey = `${path}:${JSON.stringify({ projectName, instructions, customInstructions })}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`[cache] hit: ${path} for ${projectName}`);
      return session.context.pageCache.get(cacheKey);
    }

    if (session.context.projectName !== projectName) {
      session.context.projectName = projectName;
      session.context.baseInstructions = instructions;
    }

    const pagePrompt = this.buildPagePrompt(
      path, projectName, instructions, customInstructions, session.context.generatedPages
    );

    try {
      console.log(`[generate] ${path} for ${projectName}`);

      const response = await this.genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: pagePrompt,
        config: {
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 16384,
          temperature: 0.9,
        }
      });

      const rawContent = response.text;
      console.log(`[response] ${rawContent.length} chars`);

      session.context.generatedPages.push({
        path,
        generatedAt: new Date(),
        instructions: customInstructions
      });

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);
      console.log(`[ok] ${path} (${cleanedHTML.length} chars)`);

      session.context.pageCache.set(cacheKey, cleanedHTML);
      return cleanedHTML;
    } catch (error) {
      console.error(`[error] generation failed for ${path}:`, error);
      throw error;
    }
  }

  buildPagePrompt(path, projectName, baseInstructions, customInstructions, generatedPages) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');
    const prevPages = generatedPages.map(p => p.path).join(', ');

    return `Generate the ${pageName} page for "${projectName}" at ${path}.${customInstructions ? ` Context: ${customInstructions}` : ''}${prevPages ? ` Previously generated: ${prevPages}` : ''}

DESIGN: Use a distinctive Google Font pair (never Inter/Roboto/Arial). Bold cohesive color palette with 1-2 accent colors. Creative layouts, not generic hero+cards. Depth via gradients/shadows/textures. Real believable content. No images, no emojis -- CSS/SVG/Unicode only. IDENTICAL styling across all pages.

TECHNICAL:
- Responsive, complete HTML page with <!DOCTYPE html>
- Nav linking: /, /about, /features, /pricing, /contact (highlight active)
- Relative paths only. No target="_blank", no window.open()
- Include before </body>:
<script>document.addEventListener('click',function(e){const a=e.target.closest('a');if(a&&a.href){const u=new URL(a.href);if(u.pathname!==location.pathname){e.preventDefault();parent.postMessage({type:'navigate',path:u.pathname},'*')}}});</script>

Output ONLY the HTML. No markdown fences. No explanation.`;
  }

  cleanAndValidateHTML(htmlContent) {
    let cleaned = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    const doctypeIndex = cleaned.indexOf('<!DOCTYPE');
    if (doctypeIndex > 0) {
      cleaned = cleaned.substring(doctypeIndex);
    }

    const htmlEndIndex = cleaned.lastIndexOf('</html>');
    if (htmlEndIndex > 0) {
      cleaned = cleaned.substring(0, htmlEndIndex + 7);
    }

    if (!cleaned.trim().startsWith('<!DOCTYPE')) {
      cleaned = '<!DOCTYPE html>\n' + cleaned;
    }

    // Repair truncated HTML instead of throwing
    if (!cleaned.includes('</body>')) {
      console.warn('[validate] missing </body>, appending');
      cleaned += '\n</body>';
    }
    if (!cleaned.includes('</html>')) {
      console.warn('[validate] missing </html>, appending');
      cleaned += '\n</html>';
    }

    // Only throw for truly broken content (missing opening structure)
    const critical = ['<html', '<head>', '<body>'];
    for (const tag of critical) {
      if (!cleaned.includes(tag)) {
        console.error(`[validate] FAIL: missing ${tag}`);
        throw new Error(`Generated content is missing ${tag}`);
      }
    }

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
