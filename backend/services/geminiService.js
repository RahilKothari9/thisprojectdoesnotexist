const { GoogleGenAI } = require('@google/genai');

const PRELOAD_PAGES = ['/about', '/features', '/pricing', '/contact'];

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
      return session.context.designSystem;
    }

    const prompt = `You are a world-class web designer. Create a CSS design system for "${projectName}".${instructions ? ` Direction: ${instructions}` : ''}

AESTHETIC MANDATE — this is NOT a generic website:
- Pick a BOLD conceptual direction: brutalist, art deco, organic/natural, retro-futuristic, luxury editorial, maximalist, industrial, etc. Commit fully.
- Choose fonts that are beautiful and UNEXPECTED. Never Inter, Roboto, Arial, Space Grotesk, or any default. Pick characterful display fonts paired with refined body fonts from Google Fonts.
- Color palette must be MEMORABLE — dominant colors with sharp accents. Not safe corporate blue. Think: burnt sienna + electric cyan, deep wine + gold leaf, midnight + neon coral.
- Create atmosphere: gradient meshes, noise textures, layered transparencies, dramatic shadows, geometric patterns. Not flat solid colors.

Output a SINGLE <style> tag with:
1. @import url() for 2 distinctive Google Fonts (display + body)
2. :root variables — --primary, --primary-dark, --primary-light, --accent, --bg-dark, --bg-card, --text-primary, --text-secondary, --text-muted, --border-color, --font-heading, --font-body
3. Base reset and body styles
4. .site-nav — sticky top, distinctive treatment (not just a plain flex row)
5. .site-nav a and .site-nav a.active — clear active state
6. .hero-section, .content-section — with atmospheric backgrounds
7. .card — with depth (shadows, borders, subtle gradients)
8. .btn-primary, .btn-secondary — distinctive button styles
9. .feature-grid — responsive grid layout
10. .site-footer — cohesive footer
11. Mobile responsive breakpoints
12. At least 2-3 micro-interaction hover states (transforms, glows, color shifts)

Output ONLY <style>...</style>. No HTML. No explanation. No markdown.`;

    try {
      console.log(`[design-system] generating for ${projectName}`);
      const response = await this.genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 4096,
          temperature: 1.0,
        }
      });

      let css = response.text;
      css = css.replace(/```css\n?/g, '').replace(/```\n?/g, '').trim();
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

  async generatePage(sessionId, path, projectName, instructions, designSystemCSS) {
    const session = this.getSession(sessionId);

    const cacheKey = `${path}:${projectName}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`[cache] hit: ${path}`);
      return session.context.pageCache.get(cacheKey);
    }

    // Ensure design system exists
    if (!designSystemCSS) {
      designSystemCSS = await this.generateDesignSystem(sessionId, projectName, instructions);
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
      session.context.generatedPages.push({ path, generatedAt: new Date() });
      return cleanedHTML;
    } catch (error) {
      console.error(`[error] generation failed for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Silently preload known pages in background after homepage is served.
   * Fires and forgets — errors are logged but don't propagate.
   */
  async preloadPages(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    const designCSS = session.context.designSystem;
    if (!designCSS) return;

    console.log(`[preload] starting ${PRELOAD_PAGES.length} pages for ${projectName}`);

    // Fire all in parallel, don't await — truly background
    Promise.allSettled(
      PRELOAD_PAGES.map(path =>
        this.generatePage(sessionId, path, projectName, instructions, designCSS)
          .catch(err => console.warn(`[preload] failed ${path}:`, err.message))
      )
    ).then(results => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[preload] done: ${ok}/${PRELOAD_PAGES.length} pages cached`);
    });
  }

  buildPagePrompt(path, projectName, designSystemCSS) {
    const pageName = path === '/' ? 'homepage' : path.replace(/^\//, '').replace(/[/-]/g, ' ');

    return `You are a world-class web designer and copywriter. Generate the ${pageName} page for "${projectName}" at ${path}.

USE THIS DESIGN SYSTEM — do not change fonts, colors, or core component styles. You may add page-specific layout styles.
${designSystemCSS}

DESIGN RULES:
- Layouts must feel DESIGNED, not templated. Use asymmetry, overlap, diagonal flow, generous negative space, or controlled density.
- Every section should have visual interest — atmospheric backgrounds, subtle textures, layered elements.
- Include micro-interactions: hover transforms, color shifts, subtle animations via CSS keyframes.
- Typography should breathe — varied sizes, weights, and spacing create rhythm.
- Use CSS/SVG/Unicode for all visual decoration. No images. No emojis.

CONTENT:
- Write real, specific, believable content for "${projectName}". Not lorem ipsum.
- Copywriting should feel human — punchy headlines, concise descriptions, personality.
- Include concrete details: numbers, names, specifics that make it feel like a real product.

TECHNICAL:
- Complete HTML with <!DOCTYPE html>
- Include the design system <style> in <head> exactly as provided
- Nav with class="site-nav" linking: /, /about, /features, /pricing, /contact — class="active" on current
- Use design system classes: .hero-section, .content-section, .card, .btn-primary, .feature-grid, .site-footer
- Relative paths only. No target="_blank". No window.open()
- Before </body>:
<script>document.addEventListener('click',function(e){const a=e.target.closest('a');if(a&&a.href){const u=new URL(a.href);if(u.pathname!==location.pathname){e.preventDefault();parent.postMessage({type:'navigate',path:u.pathname},'*')}}});</script>

Output ONLY the HTML. No markdown fences. No explanation.`;
  }

  cleanAndValidateHTML(htmlContent) {
    let cleaned = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    const doctypeIndex = cleaned.indexOf('<!DOCTYPE');
    if (doctypeIndex > 0) cleaned = cleaned.substring(doctypeIndex);

    const htmlEndIndex = cleaned.lastIndexOf('</html>');
    if (htmlEndIndex > 0) cleaned = cleaned.substring(0, htmlEndIndex + 7);

    if (!cleaned.trim().startsWith('<!DOCTYPE')) cleaned = '<!DOCTYPE html>\n' + cleaned;
    if (!cleaned.includes('</body>')) cleaned += '\n</body>';
    if (!cleaned.includes('</html>')) cleaned += '\n</html>';

    const critical = ['<html', '<head>', '<body>'];
    for (const tag of critical) {
      if (!cleaned.includes(tag)) {
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
    };
  }
}

module.exports = GeminiService;
