require('dotenv').config();
const express = require('express');
const { initDB } = require('./db');

// Security middleware
const security = require('./middleware/security');
const {
  globalLimiter,
  authLimiter,
  paymentLimiter,
} = require('./middleware/rateLimit');
const { checkOriginCsrf } = require('./middleware/csrf');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const dashboardRoutes = require('./routes/dashboard');
const tipsRoutes = require('./routes/tips');
const withdrawalRoutes = require('./routes/withdrawals');
const analyticsRoutes = require('./routes/analytics');
const businessRoutes = require('./routes/business');
const paymentRoutes = require('./routes/payment');
const paymentsRoutes = require('./routes/payments');
const joinRoutes = require('./routes/join');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const splitRoutes = require('./routes/split');
const onboardingRoutes = require('./routes/onboarding');
const payoutDetailsRoutes = require('./routes/payoutDetails');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudflare → nginx → node. Trust the proxy chain so req.ip reflects the real
// client IP (express-rate-limit and audit logs depend on this).
app.set('trust proxy', 1);

// ── Security headers ──
app.use(security.helmet);
app.use(security.permissionsPolicy);

// ── CORS allowlist ──
app.use(security.cors);

// ── HPP, compression, cookies ──
app.use(security.hpp);
app.use(security.compression);
app.use(security.cookieParser);

// ── Body parsers ──
// NOTE: 50mb is intentionally permissive for legacy base64 photo uploads.
// Tighten in a later commit once payload sizes are confirmed in prod logs.
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded profile images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ──
// Global fallback applies to every /api/* request; per-surface limiters layer on top.
app.use('/api', globalLimiter);
app.use('/api/payment', paymentLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api/tips', paymentLimiter);

// Web page routes (before API routes)
app.use('/join', joinRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentsRoutes);
// Admin panel uses cookie auth → CSRF defense via Origin/Referer check on
// state-changing requests (SameSite=Strict cookie is the primary defence).
app.use('/api/admin', checkOriginCsrf, adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/split', splitRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/payout-details', payoutDetailsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SnapTip API is running 🚀' });
});

// ── 404 handler ──
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).send('Not found');
});

// ── Global error handler ──
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // Log full error server-side; never leak stacks to clients.
  console.error('[error]', req.method, req.originalUrl, '-', err.message);

  // CORS rejection
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // Body too large (express.json / urlencoded)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  res.status(status).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Server error',
  });
});

// Initialize database and start server
async function start() {
  await initDB();
  if (typeof withdrawalRoutes.startScheduledPayoutScheduler === 'function') {
    withdrawalRoutes.startScheduledPayoutScheduler();
  }
  app.listen(PORT, () => {
    console.log(`🚀 SnapTip server running on http://localhost:${PORT}`);
  });
}

start();
