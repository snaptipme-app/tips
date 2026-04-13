require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const dashboardRoutes = require('./routes/dashboard');
const tipsRoutes = require('./routes/tips');
const withdrawalRoutes = require('./routes/withdrawals');
const analyticsRoutes = require('./routes/analytics');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded profile images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SnapTip API is running 🚀' });
});

// Initialize database and start server
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 SnapTip server running on http://localhost:${PORT}`);
  });
}

start();
