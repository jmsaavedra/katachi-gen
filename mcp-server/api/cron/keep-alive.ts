// Vercel Cron endpoint to keep MCP server warm
// This runs every 15 minutes to prevent cold starts

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;

  // In production, Vercel automatically adds the auth header for cron jobs
  // For manual testing, we allow any request
  if (process.env.NODE_ENV === 'production' && !authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ Keep-alive cron executed - MCP server is warm`);

    return res.status(200).json({
      status: 'ok',
      message: 'MCP server is warm',
      timestamp,
      next_run: 'in 15 minutes'
    });
  } catch (error) {
    console.error('❌ Keep-alive cron error:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
