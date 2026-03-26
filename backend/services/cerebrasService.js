const OpenAI = require('openai');

class CerebrasService {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.cerebras.ai/v1',
    });
    this.sessions = new Map();
    // Track rate limit info from response headers
    this.rateLimits = {
      requestsPerDay: { limit: 100, remaining: 100, reset: 0 },
      tokensPerMinute: { limit: 60000, remaining: 60000, reset: 0 },
    };
    console.log('[cerebras] service initialized');
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        context: {
          projectName: '',
          baseInstructions: '',
          designCSS: null,
          generatedPages: [],
          pageCache: new Map(),
          sessionStartTime: new Date(),
        }
      });
    }
    return this.sessions.get(sessionId);
  }

  getRateLimits() {
    return this.rateLimits;
  }

  /**
   * Update rate limit tracking from response headers.
   * Cerebras returns these headers on every response.
   */
  updateRateLimits(response) {
    try {
      const headers = response?.headers;
      if (!headers) return;

      // Headers object from OpenAI SDK withResponse() uses .get()
      const get = (name) => {
        const val = typeof headers.get === 'function' ? headers.get(name) : headers[name];
        return val != null ? parseInt(val, 10) : null;
      };

      const reqLimit = get('x-ratelimit-limit-requests-day');
      const reqRemaining = get('x-ratelimit-remaining-requests-day');
      const reqReset = get('x-ratelimit-reset-requests-day');
      const tokLimit = get('x-ratelimit-limit-tokens-minute');
      const tokRemaining = get('x-ratelimit-remaining-tokens-minute');
      const tokReset = get('x-ratelimit-reset-tokens-minute');

      if (reqLimit !== null) this.rateLimits.requestsPerDay.limit = reqLimit;
      if (reqRemaining !== null) this.rateLimits.requestsPerDay.remaining = reqRemaining;
      if (reqReset !== null) this.rateLimits.requestsPerDay.reset = reqReset;
      if (tokLimit !== null) this.rateLimits.tokensPerMinute.limit = tokLimit;
      if (tokRemaining !== null) this.rateLimits.tokensPerMinute.remaining = tokRemaining;
      if (tokReset !== null) this.rateLimits.tokensPerMinute.reset = tokReset;
    } catch (e) {
      // Don't let header parsing break generation
    }
  }

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
      console.log(`[cerebras][cache] hit: ${path}`);
      return session.context.pageCache.get(cacheKey);
    }

    session.context.projectName = projectName;
    session.context.baseInstructions = instructions;

    const isFirstPage = !session.context.designCSS;
    const prompt = isFirstPage
      ? this.buildHomepagePrompt(path, projectName, instructions)
      : this.buildPagePrompt(path, projectName, session.context.designCSS);

    try {
      console.log(`[cerebras][generate] ${path} for ${projectName}`);

      const completion = await this.client.chat.completions.create({
        model: 'qwen-3-235b-a22b-instruct-2507',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 16384,
        temperature: 0.9,
        // No reasoning_effort — not supported on qwen
      }).withResponse();

      // Extract headers for rate limit tracking
      this.updateRateLimits(completion.response);

      const rawContent = completion.data.choices[0]?.message?.content || '';
      console.log(`[cerebras][response] ${path} — ${rawContent.length} chars`);

      const cleanedHTML = this.cleanAndValidateHTML(rawContent);

      if (isFirstPage) {
        const extracted = this.extractStyles(cleanedHTML);
        if (extracted) {
          session.context.designCSS = extracted;
          console.log(`[cerebras][design] extracted ${extracted.length} chars of CSS from ${path}`);
        }
      }

      session.context.pageCache.set(cacheKey, cleanedHTML);
      session.context.generatedPages.push({ path, generatedAt: new Date() });
      console.log(`[cerebras][ok] ${path} (${cleanedHTML.length} chars)`);
      return cleanedHTML;
    } catch (error) {
      // Check if this is a rate limit error
      if (error.status === 429) {
        this.rateLimits.requestsPerDay.remaining = 0;
        console.error(`[cerebras][rate-limit] hit for ${path}`);
      }
      console.error(`[cerebras][error] generation failed for ${path}:`, error.message);
      throw error;
    }
  }

  preloadPages(sessionId, projectName, instructions) {
    const session = this.getSession(sessionId);
    if (!session.context.designCSS) return;

    const pages = ['/about', '/features', '/pricing', '/contact'];
    console.log(`[cerebras][preload] starting ${pages.length} pages`);

    Promise.allSettled(
      pages.map(path =>
        this.generatePage(sessionId, path, projectName, instructions)
          .catch(err => console.warn(`[cerebras][preload] failed ${path}:`, err.message))
      )
    ).then(results => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[cerebras][preload] done: ${ok}/${pages.length}`);
    });
  }

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

module.exports = CerebrasService;
