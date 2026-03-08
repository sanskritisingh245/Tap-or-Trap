require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

const { db, pool } = require('./db/drizzle');
const authRoutes = require('./routes/auth');
const creditsRoutes = require('./routes/credits');
const matchmakingRoutes = require('./routes/matchmaking');
const matchRoutes = require('./routes/match');
const { authMiddleware } = require('./middleware/auth');
const { startMatchmaker } = require('./services/matchmaker');
const { startCleanupJob } = require('./services/cleanup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Make Drizzle db available to routes
app.locals.db = db;

// Public routes (no auth required)
app.use('/auth', authRoutes);

// Protected routes (require JWT)
const statsRoutes = require('./routes/stats');
const dailyRoutes = require('./routes/daily');
app.use('/credits', authMiddleware, creditsRoutes);
app.use('/matchmaking', authMiddleware, matchmakingRoutes);
app.use('/match', authMiddleware, matchRoutes);
app.use('/stats', authMiddleware, statsRoutes);
app.use('/daily', authMiddleware, dailyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server after running migrations
async function start() {
  // Run pending Drizzle migrations
  await migrate(db, { migrationsFolder: path.join(__dirname, 'db', 'migrations') });
  console.log('Database migrations applied.');

  // Start background services
  startMatchmaker(db);
  startCleanupJob(db);

  // Listen on 0.0.0.0 so other devices on the LAN can connect
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TapRush backend running on 0.0.0.0:${PORT}`);
    const os = require('os');
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  LAN: http://${net.address}:${PORT}`);
        }
      }
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
