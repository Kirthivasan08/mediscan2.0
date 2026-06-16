require('dotenv').config();
require('express-async-errors');

const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const helmet    = require('helmet');
const session   = require('express-session');
const rateLimit = require('express-rate-limit');
const passport  = require('./config/passport');
const connectDB = require('./config/db');
const logger    = require('./config/logger');
const startCrons= require('./utils/cronJobs');

// Register Counter model BEFORE any model that uses it
require('./models/Counter');

const app = express();

app.set('trust proxy', 1);

connectDB();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);   // allow same-origin / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: r => r.url === '/api/health',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many registrations from this IP.' },
});

app.use(globalLimiter);
app.use('/api/auth/login',    loginLimiter);
app.use('/api/auth/register', registerLimiter);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('combined', {
  stream: { write: m => logger.http(m.trim()) },
  skip:   r => r.url === '/api/health',
}));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'mediscan_dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/medicines',  require('./routes/medicines'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api',            require('./routes/extra'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'MediScan API v2', version: '2.0.0', timestamp: new Date(), uptime: process.uptime() })
);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { message: err.message, url: req.originalUrl, stack: err.stack?.split('\n')[1] });

  if (err.name === 'ValidationError')
    return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map(e => e.message) });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `${field} already exists.` });
  }
  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
  if (err.name === 'CastError')
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  if (err.message?.includes('CORS'))
    return res.status(403).json({ success: false, message: err.message });

  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT   = parseInt(process.env.PORT || '5000');
const server = app.listen(PORT, () => {
  logger.info(`MediScan API v2 running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startCrons();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} already in use.`);
    process.exit(1);
  }
  logger.error('Server error', { message: err.message });
  process.exit(1);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message });
  process.exit(1);
});

module.exports = app;
