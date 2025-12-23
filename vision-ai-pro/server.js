// ==========================================
// VISION AI PRO - BACKEND SERVER
// ==========================================
// Autor: Tu nombre
// Fecha: Diciembre 2025
// Descripción: API de telemetría para Vision AI Pro
// ==========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ==========================================
// CREAR DIRECTORIO DE LOGS
// ==========================================
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('📁 Directorio de logs creado');
  } catch (error) {
    console.error('Error creando directorio de logs:', error);
  }
}

// ==========================================
// ALMACENAMIENTO DE ESTADÍSTICAS
// ==========================================
const stats = {
  totalSessions: 0,
  totalDetections: 0,
  totalFaceDetections: 0,
  totalInteractions: 0,
  sessions: [],
  lastUpdated: new Date()
};

// ==========================================
// FUNCIÓN PARA REGISTRAR EN ARCHIVOS
// ==========================================
function logToFile(eventType, data) {
  try {
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];
    const logFileName = `${eventType}_${dateString}.log`;
    const logPath = path.join(logsDir, logFileName);

    const logEntry = `[${date.toISOString()}] ${JSON.stringify(data)}\n`;

    fs.appendFileSync(logPath, logEntry, 'utf-8');
    console.log(`✅ Log registrado: ${eventType}`);
  } catch (error) {
    console.error('❌ Error registrando en archivo:', error);
  }
}

// ==========================================
// RUTAS API
// ==========================================

// 1️⃣ RUTA PRINCIPAL - Página de inicio
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vision AI Pro - Backend API</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Vision AI Pro - Backend API
        </h1>
        <p class="text-center text-blue-200 mb-8">🚀 Servidor de telemetría en vivo</p>
        
        <div class="bg-slate-800 border border-green-500 border-opacity-30 rounded-lg p-8 mb-8">
          <h2 class="text-2xl font-semibold text-green-300 mb-4">✅ Estado del Servidor</h2>
          <div class="space-y-2">
            <p class="text-green-200">🟢 Servidor activo y funcionando</p>
            <p class="text-green-200">📊 Estadísticas: <strong>${stats.totalSessions}</strong> sesiones</p>
            <p class="text-green-200">🎯 Detecciones: <strong>${stats.totalDetections}</strong> total</p>
            <p class="text-green-200">👤 Caras: <strong>${stats.totalFaceDetections}</strong> detectadas</p>
            <p class="text-green-200">🔄 Interacciones: <strong>${stats.totalInteractions}</strong> registradas</p>
          </div>
        </div>

        <div class="bg-slate-800 border border-blue-500 border-opacity-30 rounded-lg p-8 mb-8">
          <h2 class="text-2xl font-semibold text-cyan-300 mb-4">🔗 Endpoints Disponibles</h2>
          <div class="space-y-3">
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-green-500">
              <div class="text-green-400 font-bold">POST /api/session/start</div>
              <div class="text-blue-200">Inicia una nueva sesión de usuario</div>
            </div>
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-blue-500">
              <div class="text-blue-400 font-bold">POST /api/detection/record</div>
              <div class="text-blue-200">Registra detecciones de objetos y caras</div>
            </div>
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-purple-500">
              <div class="text-purple-400 font-bold">POST /api/interaction/record</div>
              <div class="text-blue-200">Registra interacciones con widgets</div>
            </div>
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-pink-500">
              <div class="text-pink-400 font-bold">POST /api/session/end</div>
              <div class="text-blue-200">Finaliza una sesión de usuario</div>
            </div>
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-yellow-500">
              <div class="text-yellow-400 font-bold">GET /api/stats</div>
              <div class="text-blue-200">Obtiene estadísticas globales</div>
            </div>
            <div class="bg-slate-700 p-4 rounded font-mono text-sm border-l-4 border-orange-500">
              <div class="text-orange-400 font-bold">GET /api/logs</div>
              <div class="text-blue-200">Lista todos los archivos de log</div>
            </div>
          </div>
        </div>

        <div class="bg-slate-800 border border-yellow-500 border-opacity-30 rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-yellow-300 mb-4">📝 Información</h2>
          <ul class="space-y-2 text-yellow-200">
            <li>✅ Servidor ejecutándose correctamente</li>
            <li>✅ Base de datos en memoria (se reinicia al redeploy)</li>
            <li>✅ Logs almacenados en archivos de texto</li>
            <li>✅ CORS habilitado para todas las aplicaciones</li>
            <li>✅ Compatible con Vision AI Pro</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 2️⃣ POST /api/session/start - Iniciar sesión
app.post('/api/session/start', (req, res) => {
  try {
    const sessionId = \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    const sessionData = {
      sessionId,
      startTime: new Date(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      faceDetections: 0,
      objectDetections: 0,
      interactions: 0,
      filters: []
    };

    stats.sessions.push(sessionData);
    stats.totalSessions++;
    stats.lastUpdated = new Date();

    logToFile('SESSION_START', {
      sessionId,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      success: true,
      sessionId, 
      message: 'Sesión iniciada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3️⃣ POST /api/detection/record - Registrar detecciones
app.post('/api/detection/record', (req, res) => {
  try {
    const { sessionId, faceCount, objectCount, confidenceLevel, detectionType } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    const session = stats.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.faceDetections += faceCount || 0;
      session.objectDetections += objectCount || 0;
      stats.totalFaceDetections += faceCount || 0;
      stats.totalDetections += (faceCount || 0) + (objectCount || 0);
      stats.lastUpdated = new Date();
    }

    logToFile('DETECTION_RECORD', {
      sessionId,
      timestamp: new Date().toISOString(),
      faceCount,
      objectCount,
      confidenceLevel,
      detectionType
    });

    res.json({ 
      success: true,
      message: 'Detección registrada',
      totalDetectionsInSession: session?.objectDetections || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4️⃣ POST /api/interaction/record - Registrar interacciones
app.post('/api/interaction/record', (req, res) => {
  try {
    const { sessionId, widgetName, action, value } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    const session = stats.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.interactions++;
      stats.totalInteractions++;
      stats.lastUpdated = new Date();

      if (widgetName === 'filterSelect') {
        if (!session.filters.includes(value)) {
          session.filters.push(value);
        }
      }
    }

    logToFile('INTERACTION_RECORD', {
      sessionId,
      timestamp: new Date().toISOString(),
      widgetName,
      action,
      value
    });

    res.json({ 
      success: true,
      message: 'Interacción registrada',
      totalInteractionsInSession: session?.interactions || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5️⃣ POST /api/session/end - Finalizar sesión
app.post('/api/session/end', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    const session = stats.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.endTime = new Date();
      session.duration = Math.round((session.endTime - session.startTime) / 1000);
      stats.lastUpdated = new Date();
    }

    logToFile('SESSION_END', {
      sessionId,
      timestamp: new Date().toISOString(),
      duration: session?.duration || 0,
      stats: {
        faceDetections: session?.faceDetections || 0,
        objectDetections: session?.objectDetections || 0,
        interactions: session?.interactions || 0
      }
    });

    res.json({ 
      success: true,
      message: 'Sesión finalizada',
      sessionStats: {
        faceDetections: session?.faceDetections || 0,
        objectDetections: session?.objectDetections || 0,
        interactions: session?.interactions || 0,
        duration: session?.duration || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6️⃣ GET /api/stats - Obtener estadísticas globales
app.get('/api/stats', (req, res) => {
  try {
    res.json({
      status: 'online',
      totalSessions: stats.totalSessions,
      totalDetections: stats.totalDetections,
      totalFaceDetections: stats.totalFaceDetections,
      totalInteractions: stats.totalInteractions,
      activeSessions: stats.sessions.filter(s => !s.endTime).length,
      avgDetectionsPerSession: stats.totalSessions > 0 ? Math.round(stats.totalDetections / stats.totalSessions) : 0,
      lastUpdated: stats.lastUpdated,
      timestamp: new Date().toISOString(),
      sessions: stats.sessions.map(s => ({
        sessionId: s.sessionId,
        startTime: s.startTime,
        endTime: s.endTime || 'En progreso',
        duration: s.duration || 'N/A',
        faceDetections: s.faceDetections,
        objectDetections: s.objectDetections,
        interactions: s.interactions,
        filters: s.filters,
        ip: s.ip
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7️⃣ GET /api/logs - Listar archivos de log
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(logsDir)) {
      return res.json({ logs: [], message: 'No hay logs disponibles aún' });
    }

    const logFiles = fs.readdirSync(logsDir);
    const logs = [];

    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line).length;

      logs.push({
        file,
        lines,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        lastModified: stats.mtime,
        url: `/api/logs/${file}`
      });
    });

    res.json({ 
      total: logs.length,
      logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8️⃣ GET /api/logs/:logFile - Descargar archivo de log específico
app.get('/api/logs/:logFile', (req, res) => {
  try {
    const logFile = path.join(logsDir, req.params.logFile);
    
    if (!logFile.startsWith(logsDir)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (!fs.existsSync(logFile)) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// EXPORTAR PARA VERCEL
// ==========================================
module.exports = app;

// ==========================================
// INICIAR SERVIDOR (desarrollo local)
// ==========================================
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║  🚀 Vision AI Pro - Backend Server             ║
║  🌐 http://localhost:${PORT}                    ║
║  📊 Estadísticas: http://localhost:${PORT}/api/stats  ║
╚════════════════════════════════════════════════╝
    `);
  });
}