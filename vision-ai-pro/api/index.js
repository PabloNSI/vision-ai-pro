// ==========================================
// VISION AI PRO - BACKEND (VERCEL SERVERLESS)
// ==========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const LOGS_DIR = process.env.LOGS_DIR || path.join('/tmp', 'logs');
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
);

// ==========================================
// LOGS (⚠️ EFÍMERO EN VERCEL)
// ==========================================
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (_) {}

// ==========================================
// ESTADO EN MEMORIA (⚠️ NO PERSISTENTE)
// ==========================================
const stats = global.__VISION_AI_STATS__ || {
  totalSessions: 0,
  totalDetections: 0,
  totalFaceDetections: 0,
  totalInteractions: 0,
  sessions: new Map(),
  serverStartTime: new Date(),
  lastUpdated: new Date()
};

global.__VISION_AI_STATS__ = stats;

// ==========================================
// UTILIDADES
// ==========================================
function logToFile(event, data) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const file = path.join(LOGS_DIR, `${event}_${date}.log`);
    fs.appendFileSync(
      file,
      JSON.stringify({ event, data, ts: new Date().toISOString() }) + '\n'
    );
  } catch (_) {}
}

const validateSession = (req, res, next) => {
  const { sessionId } = req.body;
  if (!sessionId || !stats.sessions.has(sessionId)) {
    return res.status(400).json({ success: false, error: 'Sesion invalida' });
  }
  next();
};

// ==========================================
// RUTAS API
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    sessions: {
      total: stats.totalSessions,
      active: [...stats.sessions.values()].filter(s => !s.endTime).length
    }
  });
});

// Iniciar sesion
app.post('/api/session/start', (req, res) => {
  const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  stats.sessions.set(sessionId, {
    sessionId,
    startTime: new Date(),
    faceDetections: 0,
    objectDetections: 0,
    interactions: 0,
    filters: []
  });

  stats.totalSessions++;
  stats.lastUpdated = new Date();

  logToFile('SESSION_START', { sessionId });

  res.json({ success: true, sessionId });
});

// Registrar detecciones
app.post('/api/detection/record', validateSession, (req, res) => {
  const { sessionId, faceCount = 0, objectCount = 0 } = req.body;
  const s = stats.sessions.get(sessionId);

  s.faceDetections += +faceCount;
  s.objectDetections += +objectCount;

  stats.totalFaceDetections += +faceCount;
  stats.totalDetections += +faceCount + +objectCount;
  stats.lastUpdated = new Date();

  logToFile('DETECTION', req.body);

  res.json({
    success: true,
    session: s,
    global: {
      totalDetections: stats.totalDetections
    }
  });
});

// Registrar interaccion
app.post('/api/interaction/record', validateSession, (req, res) => {
  const { sessionId, widgetName, value } = req.body;
  const s = stats.sessions.get(sessionId);

  s.interactions++;
  stats.totalInteractions++;
  stats.lastUpdated = new Date();

  if (widgetName === 'filterSelect' && value && !s.filters.includes(value)) {
    s.filters.push(value);
  }

  logToFile('INTERACTION', req.body);

  res.json({ success: true, interactions: s.interactions });
});

// Finalizar sesion
app.post('/api/session/end', validateSession, (req, res) => {
  const { sessionId } = req.body;
  const s = stats.sessions.get(sessionId);

  s.endTime = new Date();
  s.duration = Math.round((s.endTime - s.startTime) / 1000);

  logToFile('SESSION_END', s);

  res.json({ success: true, summary: s });
});

// Estadisticas globales
app.get('/api/stats', (req, res) => {
  res.json({
    uptime: Math.round((Date.now() - stats.serverStartTime) / 1000),
    stats: {
      totalSessions: stats.totalSessions,
      totalDetections: stats.totalDetections,
      totalFaceDetections: stats.totalFaceDetections,
      totalInteractions: stats.totalInteractions
    }
  });
});

// ==========================================
// 404 / ERROR
// ==========================================
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Error interno' });
});

// ==========================================
// EXPORT (CLAVE PARA VERCEL)
// ==========================================
module.exports = app;
