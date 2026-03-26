const { GoogleGenAI } = require('@google/genai');

const PRELOAD_PAGES = ['/about', '/features', '/pricing', '/contact'];

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenAI({ apiKey });
    this.sessions = new Map();
    this.inFlight = new Map(); // cacheKey → Promise, dedup concurrent requests
    // Self-tracked usage (Gemini doesn't return rate limit headers)
    this.usage = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      requestsToday: 0,
      tokensToday: 0,
      lastMinuteReset: Date.now(),
      lastDayReset: Date.now(),
      limitExceeded: false,
    };
    // Reset minute counter every 60s
    setInterval(() => {
      this.usage.requestsThisMinute = 0;
      this.usage.tokensThisMinute = 0;
      this.usage.lastMinuteReset = Date.now();
    }, 60000);
    // Reset daily counter every 24h
    setInterval(() => {
      this.usage.requestsToday = 0;
      this.usage.tokensToday = 0;
      this.usage.lastDayReset = Date.now();
      this.usage.limitExceeded = false;
    }, 86400000);
    console.log('[gemini] service initialized');
  }

  getRateLimits() {
    // Gemini free tier approximate limits for flash-lite
    const RPM_LIMIT = 30;
    const RPD_LIMIT = 1500;
    return {
      requestsPerMinute: {
        limit: RPM_LIMIT,
        remaining: Math.max(0, RPM_LIMIT - this.usage.requestsThisMinute),
      },
      requestsPerDay: {
        limit: RPD_LIMIT,
        remaining: this.usage.limitExceeded ? 0 : Math.max(0, RPD_LIMIT - this.usage.requestsToday),
      },
      tokensThisMinute: this.usage.tokensThisMinute,
      tokensToday: this.usage.tokensToday,
    };
  }

  trackRequest(response) {
    this.usage.requestsThisMinute++;
    this.usage.requestsToday++;
    try {
      const meta = response?.usageMetadata;
      if (meta) {
        const tokens = (meta.promptTokenCount || 0) + (meta.candidatesTokenCount || 0);
        this.usage.tokensThisMinute += tokens;
        this.usage.tokensToday += tokens;
      }
    } catch { /* silent */ }
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        context: {
          projectName: '',
          baseInstructions: '',
          designCSS: null, // extracted from homepage
          generatedPages: [],
          pageCache: new Map(),
          sessionStartTime: new Date(),
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Extract all <style> blocks from HTML to use as design system for other pages.
   */
  extractStyles(html) {
    const styles = [];
    const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      styles.push(match[0]);
    }
    return styles.join('\n');
  }

  async generatePage(sessionId, path, projectName, instructions) {
    const session = this.getSession(sessionId);

    const cacheKey = `${path}:${projectName}`;
    if (session.context.pageCache.has(cacheKey)) {
      console.log(`[cache] hit: ${path}`);
      return session.context.pageCache.get(cacheKey);
    }

    // Dedup: if already generating this page, return the existing promise
    if (this.inFlight.has(cacheKey)) {
      console.log(`[inflight] dedup: ${path}`);
      return this.inFlight.get(cacheKey);
    }

    const promise = this._doGeneratePage(sessionId, path, projectName, instructions, cacheKey, session);
    this.inFlight.set(cacheKey, promise);
    promise.finally(() => this.inFlight.delete(cacheKey));
    return promise;
  }

  async _doGeneratePage(sessionId, path, projectName, instructions, cacheKey, session) {
    session.context.projectName = projectName;
    session.context.baseInstructions = instructions;

    const isHomepage = path === '/';
    const hasDesignCSS = !!session.context.designCSS;

    // Build the right prompt based on whether we have a design system yet
    const prompt = isHomepage || !hasDesignCSS
      ? this.buildHomepagePrompt(path, projectName, instructions)
      : this.buildPagePrompt(path, projectName, session.context.designCSS);

    try {
      console.log(`[generate] ${path} for ${projectName}`);
      const response = await this.genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 16384,
          temperature: 0.9,
        }
      });

      this.trackRequest(response);

      const rawContent = response.text;
      console.log(`[response] ${path} — ${rawContent.length} chars`);

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);

      // If this is the first page, extract styles as the design system
      if (!hasDesignCSS) {
        const extracted = this.extractStyles(cleanedHTML);
        if (extracted) {
          session.context.designCSS = extracted;
          console.log(`[design] extracted ${extracted.length} chars of CSS from ${path}`);
        }
      }

      session.context.pageCache.set(cacheKey, cleanedHTML);
      session.context.generatedPages.push({ path, generatedAt: new Date() });
      console.log(`[ok] ${path} (${cleanedHTML.length} chars)`);
      return cleanedHTML;
    } catch (error) {
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        this.usage.limitExceeded = true;
        console.error(`[gemini][rate-limit] hit for ${path}`);
      }
      console.error(`[error] generation failed for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Silently preload known pages in background.
   */
  preloadPages(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    if (!session.context.designCSS) return;

    console.log(`[preload] starting ${PRELOAD_PAGES.length} pages for ${projectName}`);

    Promise.allSettled(
      PRELOAD_PAGES.map(path =>
        this.generatePage(sessionId, path, projectName, instructions)
          .catch(err => console.warn(`[preload] failed ${path}:`, err.message))
      )
    ).then(results => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[preload] done: ${ok}/${PRELOAD_PAGES.length}`);
    });
  }

  /**
   * Homepage prompt — establishes the design. One call, full page.
   */
  buildHomepagePrompt(path, projectName, instructions) {
    const pageName = path === '/' ? 'homepage' : path.replace(/^\//, '').replace(/[/-]/g, ' ');

    return `You are a world-class web designer and copywriter. Generate the ${pageName} for "${projectName}" at ${path}.${instructions ? ` Direction: ${instructions}` : ''}

DESIGN — this page establishes the entire site's visual identity:
- Pick a BOLD aesthetic: brutalist, art deco, retro-futuristic, luxury editorial, maximalist, industrial, organic, cyberpunk, etc. Commit fully.
- Choose 2 UNEXPECTED Google Fonts (never Inter, Roboto, Arial, Space Grotesk). One expressive display font, one refined body font.
- Color palette must be MEMORABLE with sharp accents. Not safe corporate blue. Think: burnt sienna + electric cyan, deep wine + gold leaf, midnight + neon coral.
- Create atmosphere: gradient meshes, noise textures, layered transparencies, dramatic shadows, geometric patterns.
- Layouts must feel DESIGNED: asymmetry, overlap, diagonal flow, generous negative space, or controlled density.
- Include micro-interactions: CSS hover transforms, color shifts, subtle keyframe animations.
- Typography should breathe — varied sizes, weights, and spacing create rhythm.

CONTENT:
- Real, specific, believable content. Not lorem ipsum. Punchy headlines, personality.
- Include concrete details: numbers, names, specifics that make it feel like a real product.
- No images, no emojis — CSS/SVG/Unicode decorations only.

CSS STRUCTURE — put ALL styles in a single <style> tag in <head> using CSS variables on :root:
- Define: --primary, --primary-dark, --primary-light, --accent, --bg-dark, --bg-card, --text-primary, --text-secondary, --text-muted, --font-heading, --font-body
- Include classes: .site-nav, .site-nav a, .site-nav a.active, .hero-section, .content-section, .card, .btn-primary, .btn-secondary, .feature-grid, .site-footer
- Mobile responsive breakpoints

TECHNICAL:
- Complete HTML with <!DOCTYPE html>
- Nav with class="site-nav" linking: /, /about, /features, /pricing, /contact — class="active" on current page
- Relative paths only. No target="_blank". No window.open()
- Before </body>:
<script>document.addEventListener('click',function(e){const a=e.target.closest('a');if(a&&a.href){const u=new URL(a.href);if(u.pathname!==location.pathname){e.preventDefault();parent.postMessage({type:'navigate',path:u.pathname},'*')}}});</script>

Output ONLY the HTML. No markdown fences. No explanation.`;
  }

  /**
   * Subsequent page prompt — reuses extracted CSS from homepage.
   */
  buildPagePrompt(path, projectName, designCSS) {
    const pageName = path.replace(/^\//, '').replace(/[/-]/g, ' ') || 'page';

    return `You are a world-class web designer and copywriter. Generate the ${pageName} page for "${projectName}" at ${path}.

REUSE THIS EXACT DESIGN SYSTEM — same fonts, colors, nav, component styles. Do NOT define new fonts or override colors. You may add page-specific layout styles.
${designCSS}

CONTENT:
- Real, specific, believable content for a ${pageName} page. Not lorem ipsum.
- Punchy headlines, personality, concrete details (numbers, names, specifics).
- No images, no emojis — CSS/SVG/Unicode decorations only.

DESIGN:
- Use the component classes from the design system: .site-nav, .hero-section, .content-section, .card, .btn-primary, .feature-grid, .site-footer
- Maintain the same atmospheric backgrounds, hover effects, and typography rhythm.
- Layouts should feel designed — not a copy of the homepage structure.

TECHNICAL:
- Complete HTML with <!DOCTYPE html>
- Put the provided <style> tag(s) in <head> exactly as given
- Nav with class="site-nav" linking: /, /about, /features, /pricing, /contact — class="active" on current page
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
