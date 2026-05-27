const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// CORS_ORIGINS env: comma-separated list. Defaults to production hosts.
const allowedOrigins = (process.env.CORS_ORIGINS ||
  'https://snaptip.me,https://www.snaptip.me')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow tools, curl, server-to-server, and Expo dev clients (no Origin header)
    if (!origin) return cb(null, true);
    // Mobile dev: Expo Go (exp://) and dev tunnels
    if (origin.startsWith('exp://') || origin.startsWith('http://localhost')) {
      return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
};

const helmetConfig = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // The static client bundle is served by nginx, not this API. Keep CSP
      // tight here — only inline assets the API itself returns (join pages).
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: [
        "'self'",
        'https://snaptip.me',
        'https://api.snaptip.me',
        'https://api.stripe.com',
        'https://r.stripe.com',
        'https://m.stripe.network',
        'https://q.stripe.com',
      ],
      frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // would block /uploads from being embedded
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});

// Permissions-Policy is not in helmet's defaults — set explicitly.
function permissionsPolicy(_req, res, next) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  next();
}

module.exports = {
  cors: cors(corsOptions),
  helmet: helmetConfig,
  hpp: hpp(),
  compression: compression(),
  cookieParser: cookieParser(process.env.COOKIE_SECRET || undefined),
  permissionsPolicy,
  allowedOrigins,
};
