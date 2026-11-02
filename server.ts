import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'roster-data.json');

app.use(express.json({ limit: '10mb' }));

// Explicitly serve Service Worker & Manifest with correct MIME types for Chrome & Android PWA install
app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get('/manifest.webmanifest', (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});

app.get('/manifest.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache + file persistence
const DEFAULT_ROSTER = {
  baselineDate: '2026-10-29',
  students: [
    { id: '1', name: 'Bhargav', isAway: false },
    { id: '2', name: 'Sudarshan', isAway: false },
    { id: '3', name: 'Preetham B', isAway: false },
    { id: '4', name: 'Aneesh', isAway: false },
    { id: '5', name: 'Shreyas', isAway: false },
    { id: '6', name: 'Narasimha', isAway: false },
    { id: '7', name: 'Mr Preetham', isAway: false },
    { id: '8', name: 'Mohan', isAway: false },
    { id: '9', name: 'Pavanaj', isAway: false },
    { id: '10', name: 'Vasanth', isAway: false },
    { id: '11', name: 'Sheersha', isAway: false },
    { id: '12', name: 'Tharun', isAway: false },
    { id: '13', name: 'Sanjay', isAway: false },
    { id: '14', name: 'Hemanth', isAway: false },
    { id: '15', name: 'Abhay', isAway: false },
    { id: '16', name: 'Vikas', isAway: false },
    { id: '17', name: 'Kushal', isAway: false },
  ],
  duties: [
    {
      id: '10_turn',
      title: '10 Turn',
      subtitle: 'Bathroom cleaning',
      memberCount: 1,
      direction: 'forward',
      baseNames: ['Shreyas'],
    },
    {
      id: 'veg_turn',
      title: 'Veg Turn',
      subtitle: 'Vegetable duty',
      memberCount: 1,
      direction: 'reverse',
      baseNames: ['Sheersha'],
    },
    {
      id: 'prayer_hall',
      title: 'Prayer Hall',
      subtitle: 'Prayer hall cleaning',
      memberCount: 2,
      direction: 'forward',
      baseNames: ['Tharun', 'Sheersha'],
    },
    {
      id: 'milk_curd',
      title: 'Hallu Mosaru',
      subtitle: 'Milk / curd duty',
      memberCount: 1,
      direction: 'forward',
      baseNames: ['Bhargav'],
    },
    {
      id: 'majjige_turn',
      title: 'Majjige Turn',
      subtitle: 'Buttermilk duty',
      memberCount: 1,
      direction: 'reverse',
      baseNames: ['Sudarshan'],
    },
    {
      id: 'gante',
      title: 'Gante',
      subtitle: 'Bell duty',
      memberCount: 1,
      direction: 'reverse',
      baseNames: ['Sheersha'],
    },
  ],
  penalties: [],
  overrides: {},
  completedDuties: {},
  adminPasswordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA-256 for "admin123"
  isPasswordSet: false,
  lastUpdated: Date.now(),
};

let cachedRoster: Record<string, unknown> | null = null;

// Connected SSE clients for instantaneous live updates across all devices
const sseClients = new Set<express.Response>();

function loadPersistedRoster() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.students) && parsed.students.length >= 3) {
        // Auto-heal old invalid hash if present
        let currentHash = parsed.adminPasswordHash;
        if (!currentHash || currentHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa82280f1a7ca47dd') {
          currentHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
        }
        cachedRoster = {
          ...DEFAULT_ROSTER,
          ...parsed,
          duties: Array.isArray(parsed.duties) && parsed.duties.length > 0 ? parsed.duties : DEFAULT_ROSTER.duties,
          adminPasswordHash: currentHash,
          penalties: Array.isArray(parsed.penalties) ? parsed.penalties : [],
          overrides: parsed.overrides || {},
          completedDuties: parsed.completedDuties || {},
        };
        console.log('Loaded persisted roster data from storage.');
        return;
      }
    }
  } catch (err) {
    console.error('Error reading persisted roster:', err);
  }
  cachedRoster = { ...DEFAULT_ROSTER, lastUpdated: Date.now() };
  savePersistedRoster(cachedRoster);
}

function savePersistedRoster(data: Record<string, unknown>) {
  try {
    cachedRoster = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persisted roster:', err);
  }
}

function broadcastRosterUpdate(data: Record<string, unknown>) {
  const payload = `data: ${JSON.stringify({ type: 'UPDATE', data })}\n\n`;
  console.log(`[LIVE STREAM] Broadcasting instant update to ${sseClients.size} connected device(s)...`);
  for (const client of Array.from(sseClients)) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

loadPersistedRoster();

// REST API Endpoints
app.get('/api/roster', (_req, res) => {
  res.json({
    success: true,
    data: cachedRoster,
    lastUpdated: (cachedRoster as { lastUpdated?: number })?.lastUpdated || 0,
  });
});

app.post('/api/roster', (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.students)) {
    res.status(400).json({ success: false, message: 'Invalid roster data' });
    return;
  }
  data.lastUpdated = Date.now();
  savePersistedRoster(data);

  // Instantly broadcast change to all connected Android apps & phones
  broadcastRosterUpdate(data);

  res.json({ success: true, lastUpdated: data.lastUpdated });
});

// SSE Live Stream: pushes updates IMMEDIATELY when admin changes anything
app.get('/api/roster/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send current cached data immediately upon connection
  if (cachedRoster) {
    res.write(`data: ${JSON.stringify({ type: 'SYNC', data: cachedRoster })}\n\n`);
  }

  sseClients.add(res);

  // Keep-alive ping every 12 seconds to prevent mobile network dropouts
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 12000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// Reset endpoint
app.post('/api/roster/reset', (_req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    cachedRoster = null;
    broadcastRosterUpdate({});
    res.json({ success: true, message: 'Server roster reset' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset' });
  }
});

// Mount Vite middleware in dev / static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.join(__dirname, 'dist');

  if (isProd && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hostel Duty Roster live server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
