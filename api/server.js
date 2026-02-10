// Vercel serverless function entry point
// Wraps the Express app for modern Vercel deployment with proper timeout support
let app;

export const maxDuration = 60;

export default async function handler(req, res) {
  if (!app) {
    const mod = await import('../backend/server.js');
    app = mod.default || mod;
  }
  return app(req, res);
}
