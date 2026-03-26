const { GoogleGenAI } = require('@google/genai');

const SITE_PAGES = ['/', '/about', '/features', '/pricing', '/contact'];

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
          designSystem: null,
          generatedPages: [],
          pageCache: new Map(),
          sessionStartTime: new Date(),
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  async generateDesignSystem(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);

    if (session.context.designSystem) {
      console.log(`[cache] hit: design system for ${projectName}`);
      return session.context.designSystem;
    }

    const prompt = `Create a CSS design system for a website called "${projectName}".${instructions ? ` Style direction: ${instructions}` : ''}

Output a SINGLE <style> tag containing:
1. A Google Font @import for a distinctive font pair (NEVER Inter, Roboto, or Arial — pick expressive, memorable fonts)
2. CSS custom properties on :root for: --primary, --primary-dark, --primary-light, --accent, --bg-dark, --bg-card, --text-primary, --text-secondary, --text-muted, --border-color, --gradient-primary, --shadow-primary, --font-heading, --font-body
3. A bold cohesive color palette with 1-2 accent colors. Not generic — make it memorable.
4. Base reset (* { margin:0; padding:0; box-sizing:border-box })
5. Body styles using the variables (dark theme, the body font, colors)
6. Nav styles: .site-nav (flex, sticky top), .site-nav a, .site-nav a.active
7. Section styles: .hero-section, .content-section (alternating backgrounds)
8. Component styles: .card, .btn-primary, .btn-secondary, .feature-grid
9. Footer styles: .site-footer
10. Responsive media queries for mobile

Use depth via gradients, shadows, and textures. Make it visually striking.
Output ONLY the <style>...</style> tag. No HTML, no explanation, no markdown fences.`;

    try {
      console.log(`[design-system] generating for ${projectName}`);
      const response = await this.genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 4096,
          temperature: 0.9,
        }
      });

      let css = response.text;
      // Clean markdown fences if present
      css = css.replace(/```css\n?/g, '').replace(/```\n?/g, '').trim();

      // Ensure it's wrapped in style tags
      if (!css.startsWith('<style')) {
        css = `<style>\n${css}\n</style>`;
      }

      console.log(`[design-system] done (${css.length} chars)`);
      session.context.designSystem = css;
      session.context.projectName = projectName;
      session.context.baseInstructions = instructions;
      return css;
    } catch (error) {
      console.error(`[error] design system failed:`, error);
      throw error;
    }
  }

  async generatePage(sessionId, path, projectName, designSystemCSS) {
    const session = this.getSession(sessionId);

    const cacheKey = `${path}:${projectName}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`[cache] hit: ${path} for ${projectName}`);
      return session.context.pageCache.get(cacheKey);
    }

    const pagePrompt = this.buildPagePrompt(path, projectName, designSystemCSS);

    try {
      console.log(`[generate] ${path} for ${projectName}`);

      const response = await this.genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: pagePrompt,
        config: {
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 16384,
          temperature: 0.9,
        }
      });

      const rawContent = response.text;
      console.log(`[response] ${path} — ${rawContent.length} chars`);

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);
      console.log(`[ok] ${path} (${cleanedHTML.length} chars)`);

      session.context.pageCache.set(cacheKey, cleanedHTML);
      session.context.generatedPages.push({
        path,
        generatedAt: new Date(),
      });

      return cleanedHTML;
    } catch (error) {
      console.error(`[error] generation failed for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Generate entire site: design system + all pages in parallel.
   * Calls onEvent(event) as each piece completes.
   * event: { type: 'design-system'|'page'|'error'|'done', ... }
   */
  async generateSite(sessionId, projectName, instructions, onEvent) {
    // Phase 1: Design system
    let designSystemCSS;
    try {
      designSystemCSS = await this.generateDesignSystem(sessionId, projectName, instructions);
      onEvent({ type: 'design-system', css: designSystemCSS });
    } catch (error) {
      onEvent({ type: 'error', phase: 'design-system', message: error.message });
      return;
    }

    // Phase 2: All pages in parallel
    let pagesReady = 0;
    const results = await Promise.allSettled(
      SITE_PAGES.map(async (path) => {
        try {
          const html = await this.generatePage(sessionId, path, projectName, designSystemCSS);
          pagesReady++;
          onEvent({ type: 'page', path, html, pagesReady, totalPages: SITE_PAGES.length });
          return { path, html };
        } catch (error) {
          onEvent({ type: 'error', path, message: error.message });
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    onEvent({ type: 'done', totalPages: successful, totalRequested: SITE_PAGES.length });
  }

  buildPagePrompt(path, projectName, designSystemCSS) {
    const pageName = path === '/' ? 'homepage' : path.replace('/', '');

    return `Generate the ${pageName} page for "${projectName}" at ${path}.

USE THIS DESIGN SYSTEM EXACTLY — do not add new fonts, colors, or component base styles. You may add page-specific layout styles.
${designSystemCSS}

CONTENT: Write real, believable content for a ${pageName} page. Be creative and specific to "${projectName}". No lorem ipsum. No images, no emojis — CSS/SVG/Unicode decorations only.

TECHNICAL:
- Complete HTML page with <!DOCTYPE html>
- Put the design system <style> tag in <head> exactly as provided above
- Nav using class="site-nav" linking: /, /about, /features, /pricing, /contact — add class="active" to the current page link
- Use the component classes from the design system: .hero-section, .content-section, .card, .btn-primary, .feature-grid, .site-footer
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

    if (!cleaned.includes('</body>')) {
      console.warn('[validate] missing </body>, appending');
      cleaned += '\n</body>';
    }
    if (!cleaned.includes('</html>')) {
      console.warn('[validate] missing </html>, appending');
      cleaned += '\n</html>';
    }

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
