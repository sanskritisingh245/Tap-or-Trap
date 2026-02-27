require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

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

// Initialize SQLite database
const dbPath = path.join(__dirname, 'snapduel.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations: add columns if missing (existing DBs)
const migrations = [
  'ALTER TABLE players ADD COLUMN credits INTEGER NOT NULL DEFAULT 5',
  'ALTER TABLE players ADD COLUMN wins INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE players ADD COLUMN losses INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE players ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE players ADD COLUMN max_streak INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE players ADD COLUMN best_reaction_ms REAL',
  'ALTER TABLE players ADD COLUMN total_matches INTEGER NOT NULL DEFAULT 0',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// Make db available to routes
app.locals.db = db;

// Public routes (no auth required)
app.use('/auth', authRoutes);

// Protected routes (require JWT)
const statsRoutes = require('./routes/stats');
app.use('/credits', authMiddleware, creditsRoutes);
app.use('/matchmaking', authMiddleware, matchmakingRoutes);
app.use('/match', authMiddleware, matchRoutes);
app.use('/stats', authMiddleware, statsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start background services
startMatchmaker(db);
startCleanupJob(db);

// Listen on 0.0.0.0 so other devices on the LAN can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SnapDuel backend running on 0.0.0.0:${PORT}`);
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

module.exports = app;
