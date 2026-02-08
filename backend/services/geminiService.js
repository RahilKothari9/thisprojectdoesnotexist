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
        model: "gemini-3-flash-preview",
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
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          maxOutputTokens: 8192,
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
    return `You are an expert frontend designer. You will generate a complete, visually striking website for "${projectName}".
${instructions ? `\nUser instructions: ${instructions}` : ''}

DESIGN PRINCIPLES -- follow these strictly:

1. TYPOGRAPHY: Pick ONE distinctive Google Font pairing. Never use Inter, Roboto, Arial, or system fonts. Choose something with character -- a bold display font paired with a clean body font. Load them via <link> from fonts.googleapis.com.

2. COLOR: Commit to a bold, cohesive palette. Use a dominant background color with 1-2 sharp accent colors. No bland grays-on-white. No purple gradients. Think editorial, think intentional.

3. LAYOUT: Be creative with spatial composition. Use generous whitespace OR controlled density. Asymmetric layouts, overlapping elements, full-bleed sections, and unexpected grid patterns are all welcome. Avoid the generic "hero + 3 cards + footer" template.

4. ATMOSPHERE: Add depth through subtle background textures, gradients, shadows, or patterns. Not flat. Not generic. Every page should feel designed, not generated.

5. CONTENT: Write real, specific, believable content for the project. Not lorem ipsum. Not generic placeholder text. Write as if this is a real product with real users.

6. NO IMAGES: Use CSS, SVG, Unicode, and clever styling instead of images. No external image URLs, no placeholder images.

7. NO EMOJIS: Do not use emoji characters anywhere in the generated HTML. Use icons via SVG or CSS instead.

TECHNICAL REQUIREMENTS:
- Fully responsive (mobile-first)
- IDENTICAL styling across ALL pages (same fonts, colors, nav, footer)
- Same navigation menu on every page with links to: /, /about, /features, /pricing, /contact
- ALL links must use RELATIVE PATHS ONLY (href="/about", not absolute URLs)
- NEVER use target="_blank" or window.open()
- Include this navigation script before </body>:

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

OUTPUT FORMAT:
Return ONLY the complete HTML document. No markdown, no explanation, no commentary.
Start with <!DOCTYPE html> and end with </html>.

Respond "Ready" to confirm you understand.`;
  }

  buildPagePrompt(path, projectName, baseInstructions, customInstructions, generatedPages) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');
    const previousPages = generatedPages.map(p => p.path).join(', ') || 'none yet';

    return `Generate the ${pageName} page for "${projectName}" at path: ${path}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}

Previously generated pages: ${previousPages}

DESIGN RULES (critical -- follow exactly):

1. MATCH the exact same visual identity as previous pages: same fonts, same color palette, same navigation, same footer. Visual consistency is non-negotiable.

2. TYPOGRAPHY: Use the same distinctive Google Font pairing established in previous pages. Load via <link> from fonts.googleapis.com. Never fall back to generic fonts.

3. LAYOUT for this page should be UNIQUE from other pages while maintaining the same design system. Use creative section layouts -- not just stacked boxes. Consider:
   - Alternating content/visual sections
   - Bento grid layouts
   - Full-width dramatic sections mixed with contained content
   - Asymmetric two-column layouts
   - Overlapping elements with z-index

4. CONTENT: Write real, specific, believable content appropriate for this page type. Not placeholder text. If this is a pricing page, write real-sounding plans. If about, write a compelling story.

5. NO IMAGES, NO EMOJIS: Use CSS, SVG, and Unicode for visual elements. Never use emoji characters. Never use external image URLs.

6. ATMOSPHERE: Maintain the same background treatment, shadows, and visual depth as other pages.

TECHNICAL REQUIREMENTS:
- Fully responsive
- Same navigation with links to: /, /about, /features, /pricing, /contact
- Active page should be visually indicated in the nav
- ALL links use RELATIVE PATHS ONLY
- NEVER use target="_blank" or window.open()
- Must include this script before </body>:

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

OUTPUT: Return ONLY the complete HTML. No markdown fences, no explanation. Start with <!DOCTYPE html>, end with </html>.

Generate the complete HTML now:`;
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
