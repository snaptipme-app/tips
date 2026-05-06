const rateLimit = require('express-rate-limit');

// Behind Cloudflare → trust proxy is set in index.js.
// rateLimit will pick up the real client IP from req.ip after that.

const message = (msg) => ({ error: msg, code: 'RATE_LIMITED' });

// Global fallback — generous; per-endpoint limiters are stricter.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests, please slow down.'),
});

// Auth surfaces — login, register, password reset. Tight.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // a successful login shouldn't burn the budget
  message: message('Too many authentication attempts. Try again in 15 minutes.'),
});

// OTP send / verify — even tighter to prevent SMS/email bombing and brute force.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many OTP requests. Try again later.'),
});

// Public payment + tip routes — public-facing, must allow legitimate traffic
// but stop scripted abuse.
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many payment attempts. Try again in a few minutes.'),
});

// Admin login — very tight; the admin panel has a single operator.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many admin login attempts.'),
});

// Search/Verify Limiter: Allow 60 requests per minute
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many search requests. Please slow down.'),
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  paymentLimiter,
  adminLoginLimiter,
  searchLimiter,
};
