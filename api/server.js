// Vercel serverless function entry point
let app;

export const maxDuration = 60;

export default async function handler(req, res) {
  if (!app) {
    const mod = await import('../backend/server.js');
    app = mod.default || mod;
  }
  return app(req, res);
}
