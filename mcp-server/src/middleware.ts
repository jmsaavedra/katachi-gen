import { type Middleware } from 'xmcp';
import rateLimit from 'express-rate-limit';

// Rate limit deployed version, tweak or remove when self-hosting.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 75 : 1000, // Higher limit for dev
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false, // Disable X-Forwarded-For validation
  },
});

const middleware: Middleware = async (req, res, next) => {
  // Only rate limit in production deployed MCP server, and skip if DISABLE_RATE_LIMIT is set
  if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  return new Promise((resolve, reject) => {
    limiter(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(
        'middleware',
        JSON.stringify(
          {
            body: req.body,
            headers: req.headers,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
          },
          null,
          2
        )
      );

      resolve(next());
    });
  });
};

export default middleware;
