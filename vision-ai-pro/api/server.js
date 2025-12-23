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
const rateLimit = require('express-rate-limit');

const app = express();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ==========================================
// MIDDLEWARE
// ==========================================
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

// ==========================================
// CREAR DIRECTORIO DE LOGS
// ==========================================
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    console.log('📁 Directorio de logs creado:', LOGS_DIR);
  } catch (error) {
    console.error('❌ Error creando directorio de logs:', error);
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
  sessions: new Map(), // Usar Map para mejor performance
  lastUpdated: new Date(),
  serverStartTime: new Date()
};

// ==========================================
// FUNCIÓN PARA REGISTRAR EN ARCHIVOS
// ==========================================
function logToFile(eventType, data) {
  try {
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];
    const logFileName = `${eventType}_${dateString}.log`;
    const logPath = path.join(LOGS_DIR, logFileName);

    // Verificar tamaño del archivo
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_FILE_SIZE) {
        const backupPath = path.join(LOGS_DIR, `${eventType}_${dateString}_${Date.now()}.log.backup`);
        fs.renameSync(logPath, backupPath);
        console.log(`📦 Log archivado: ${backupPath}`);
      }
    }

    const logEntry = JSON.stringify({
      timestamp: date.toISOString(),
      event: eventType,
      data: data,
      pid: process.pid
    }) + '\n';

    fs.appendFile(logPath, logEntry, 'utf-8', (err) => {
      if (err) console.error('❌ Error escribiendo log:', err);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error registrando en archivo:', error);
    return false;
  }
}

// ==========================================
// MIDDLEWARE DE VALIDACIÓN
// ==========================================
const validateSession = (req, res, next) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'sessionId es requerido',
      success: false 
    });
  }
  
  if (!stats.sessions.has(sessionId)) {
    return res.status(404).json({ 
      error: 'Sesión no encontrada o ya finalizada',
      success: false 
    });
  }
  
  next();
};

// ==========================================
// RUTAS API
// ==========================================

// 1️⃣ RUTA PRINCIPAL - Página de inicio
app.get('/', (req, res) => {
  const activeSessions = Array.from(stats.sessions.values())
    .filter(s => !s.endTime).length;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vision AI Pro - Backend API</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div class="max-w-6xl mx-auto">
        <header class="text-center mb-10">
          <h1 class="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            <i class="fas fa-robot mr-3"></i>Vision AI Pro - Backend API
          </h1>
          <p class="text-gray-300 text-lg">🚀 Servidor de telemetría en tiempo real</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div class="bg-gray-800 border border-green-500 rounded-xl p-6 shadow-lg">
            <div class="flex items-center mb-4">
              <i class="fas fa-users text-green-400 text-2xl mr-3"></i>
              <h3 class="text-xl font-semibold">Sesiones Activas</h3>
            </div>
            <p class="text-4xl font-bold text-green-300">${activeSessions}</p>
            <p class="text-gray-400 mt-2">Total: ${stats.totalSessions}</p>
          </div>

          <div class="bg-gray-800 border border-blue-500 rounded-xl p-6 shadow-lg">
            <div class="flex items-center mb-4">
              <i class="fas fa-eye text-blue-400 text-2xl mr-3"></i>
              <h3 class="text-xl font-semibold">Detecciones</h3>
            </div>
            <p class="text-4xl font-bold text-blue-300">${stats.totalDetections}</p>
            <p class="text-gray-400 mt-2">Caras: ${stats.totalFaceDetections}</p>
          </div>

          <div class="bg-gray-800 border border-purple-500 rounded-xl p-6 shadow-lg">
            <div class="flex items-center mb-4">
              <i class="fas fa-mouse-pointer text-purple-400 text-2xl mr-3"></i>
              <h3 class="text-xl font-semibold">Interacciones</h3>
            </div>
            <p class="text-4xl font-bold text-purple-300">${stats.totalInteractions}</p>
            <p class="text-gray-400 mt-2">Promedio por sesión: ${stats.totalSessions > 0 ? Math.round(stats.totalInteractions / stats.totalSessions) : 0}</p>
          </div>

          <div class="bg-gray-800 border border-yellow-500 rounded-xl p-6 shadow-lg">
            <div class="flex items-center mb-4">
              <i class="fas fa-clock text-yellow-400 text-2xl mr-3"></i>
              <h3 class="text-xl font-semibold">Tiempo Activo</h3>
            </div>
            <p class="text-4xl font-bold text-yellow-300">${Math.round((new Date() - stats.serverStartTime) / 3600000)}h</p>
            <p class="text-gray-400 mt-2">Desde: ${stats.serverStartTime.toLocaleString()}</p>
          </div>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-xl p-8 mb-8 shadow-lg">
          <h2 class="text-3xl font-bold text-cyan-300 mb-6 flex items-center">
            <i class="fas fa-plug mr-3"></i> Endpoints Disponibles
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${[
              { method: 'POST', path: '/api/session/start', desc: 'Inicia una nueva sesión de usuario', color: 'green' },
              { method: 'POST', path: '/api/detection/record', desc: 'Registra detecciones de objetos y caras', color: 'blue' },
              { method: 'POST', path: '/api/interaction/record', desc: 'Registra interacciones con widgets', color: 'purple' },
              { method: 'POST', path: '/api/session/end', desc: 'Finaliza una sesión de usuario', color: 'pink' },
              { method: 'GET', path: '/api/stats', desc: 'Obtiene estadísticas globales', color: 'yellow' },
              { method: 'GET', path: '/api/logs', desc: 'Lista todos los archivos de log', color: 'orange' },
              { method: 'GET', path: '/api/health', desc: 'Verifica estado del servidor', color: 'green' },
              { method: 'GET', path: '/api/logs/:logFile', desc: 'Descarga archivo de log específico', color: 'red' }
            ].map(endpoint => `
              <div class="bg-gray-900 p-4 rounded-lg border-l-4 border-${endpoint.color}-500 hover:bg-gray-850 transition">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-mono text-sm px-2 py-1 rounded bg-${endpoint.color}-900 text-${endpoint.color}-300">
                    ${endpoint.method}
                  </span>
                  <span class="text-xs text-gray-400">API</span>
                </div>
                <div class="font-mono text-${endpoint.color}-200 mb-1">${endpoint.path}</div>
                <div class="text-gray-300 text-sm">${endpoint.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg">
          <h2 class="text-3xl font-bold text-yellow-300 mb-6 flex items-center">
            <i class="fas fa-info-circle mr-3"></i> Información del Sistema
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-xl font-semibold text-green-300 mb-3">✅ Características</h3>
              <ul class="space-y-2 text-gray-300">
                <li><i class="fas fa-check text-green-400 mr-2"></i> Servidor ejecutándose correctamente</li>
                <li><i class="fas fa-check text-green-400 mr-2"></i> Almacenamiento en memoria (Map)</li>
                <li><i class="fas fa-check text-green-400 mr-2"></i> Logs rotativos con backup automático</li>
                <li><i class="fas fa-check text-green-400 mr-2"></i> Rate limiting (100 req/15min)</li>
                <li><i class="fas fa-check text-green-400 mr-2"></i> CORS configurable por entorno</li>
                <li><i class="fas fa-check text-green-400 mr-2"></i> Validación de sesiones</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-blue-300 mb-3">📊 Estadísticas Técnicas</h3>
              <ul class="space-y-2 text-gray-300">
                <li><i class="fas fa-server text-blue-400 mr-2"></i> PID: ${process.pid}</li>
                <li><i class="fas fa-code-branch text-blue-400 mr-2"></i> Node.js: ${process.version}</li>
                <li><i class="fas fa-memory text-blue-400 mr-2"></i> Memoria: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB</li>
                <li><i class="fas fa-folder text-blue-400 mr-2"></i> Logs: ${LOGS_DIR}</li>
                <li><i class="fas fa-clock text-blue-400 mr-2"></i> Última actualización: ${stats.lastUpdated.toLocaleTimeString()}</li>
                <li><i class="fas fa-shield-alt text-blue-400 mr-2"></i> Entorno: ${process.env.NODE_ENV || 'development'}</li>
              </ul>
            </div>
          </div>
        </div>

        <footer class="mt-12 text-center text-gray-500 text-sm">
          <p>© ${new Date().getFullYear()} Vision AI Pro - Sistema de Telemetría</p>
          <p class="mt-2">📡 Puerto: ${PORT} | 🚀 Ready for production</p>
        </footer>
      </div>
    </body>
    </html>
  `);
});

// 2️⃣ GET /api/health - Verificar estado del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    sessions: {
      total: stats.totalSessions,
      active: Array.from(stats.sessions.values()).filter(s => !s.endTime).length
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3️⃣ POST /api/session/start - Iniciar sesión
app.post('/api/session/start', (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
    
    const sessionData = {
      sessionId,
      startTime: new Date(),
      userAgent,
      ip,
      faceDetections: 0,
      objectDetections: 0,
      interactions: 0,
      filters: [],
      lastActivity: new Date()
    };

    stats.sessions.set(sessionId, sessionData);
    stats.totalSessions++;
    stats.lastUpdated = new Date();

    logToFile('SESSION_START', {
      sessionId,
      ip,
      userAgent: userAgent.substring(0, 200), // Limitar tamaño
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      sessionId, 
      message: 'Sesión iniciada correctamente',
      timestamp: sessionData.startTime.toISOString(),
      sessionData: {
        ...sessionData,
        userAgent: undefined // No enviar userAgent completo en respuesta
      }
    });
  } catch (error) {
    console.error('Error en session/start:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      success: false 
    });
  }
});

// 4️⃣ POST /api/detection/record - Registrar detecciones
app.post('/api/detection/record', validateSession, (req, res) => {
  try {
    const { sessionId, faceCount = 0, objectCount = 0, confidenceLevel, detectionType, metadata } = req.body;

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Sesión no encontrada',
        success: false 
      });
    }

    // Actualizar sesión
    session.faceDetections += parseInt(faceCount);
    session.objectDetections += parseInt(objectCount);
    session.lastActivity = new Date();

    // Actualizar estadísticas globales
    stats.totalFaceDetections += parseInt(faceCount);
    stats.totalDetections += parseInt(faceCount) + parseInt(objectCount);
    stats.lastUpdated = new Date();

    logToFile('DETECTION_RECORD', {
      sessionId,
      timestamp: new Date().toISOString(),
      faceCount: parseInt(faceCount),
      objectCount: parseInt(objectCount),
      confidenceLevel,
      detectionType,
      metadata
    });

    res.json({ 
      success: true,
      message: 'Detección registrada exitosamente',
      sessionStats: {
        faceDetections: session.faceDetections,
        objectDetections: session.objectDetections,
        totalDetections: session.faceDetections + session.objectDetections
      },
      globalStats: {
        totalFaceDetections: stats.totalFaceDetections,
        totalDetections: stats.totalDetections
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en detection/record:', error);
    res.status(500).json({ 
      error: 'Error procesando detección',
      success: false 
    });
  }
});

// 5️⃣ POST /api/interaction/record - Registrar interacciones
app.post('/api/interaction/record', validateSession, (req, res) => {
  try {
    const { sessionId, widgetName, action, value, coordinates } = req.body;

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Sesión no encontrada',
        success: false 
      });
    }

    session.interactions++;
    session.lastActivity = new Date();
    stats.totalInteractions++;
    stats.lastUpdated = new Date();

    if (widgetName === 'filterSelect' && value && !session.filters.includes(value)) {
      session.filters.push(value);
    }

    logToFile('INTERACTION_RECORD', {
      sessionId,
      timestamp: new Date().toISOString(),
      widgetName,
      action,
      value,
      coordinates
    });

    res.json({ 
      success: true,
      message: 'Interacción registrada exitosamente',
      sessionStats: {
        totalInteractions: session.interactions,
        uniqueFilters: session.filters.length,
        lastActivity: session.lastActivity
      },
      globalStats: {
        totalInteractions: stats.totalInteractions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en interaction/record:', error);
    res.status(500).json({ 
      error: 'Error procesando interacción',
      success: false 
    });
  }
});

// 6️⃣ POST /api/session/end - Finalizar sesión
app.post('/api/session/end', validateSession, (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Sesión no encontrada',
        success: false 
      });
    }

    session.endTime = new Date();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);
    session.lastActivity = new Date();
    stats.lastUpdated = new Date();

    logToFile('SESSION_END', {
      sessionId,
      timestamp: new Date().toISOString(),
      duration: session.duration,
      stats: {
        faceDetections: session.faceDetections,
        objectDetections: session.objectDetections,
        interactions: session.interactions,
        filters: session.filters
      }
    });

    // Preparar respuesta
    const response = {
      success: true,
      message: 'Sesión finalizada exitosamente',
      sessionSummary: {
        sessionId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: `${session.duration} segundos`,
        faceDetections: session.faceDetections,
        objectDetections: session.objectDetections,
        totalDetections: session.faceDetections + session.objectDetections,
        interactions: session.interactions,
        uniqueFilters: session.filters.length,
        filters: session.filters
      },
      timestamp: new Date().toISOString()
    };

    // Opcional: Limpiar sesión después de un tiempo
    setTimeout(() => {
      stats.sessions.delete(sessionId);
    }, 60000); // Eliminar después de 1 minuto

    res.json(response);
  } catch (error) {
    console.error('Error en session/end:', error);
    res.status(500).json({ 
      error: 'Error finalizando sesión',
      success: false 
    });
  }
});

// 7️⃣ GET /api/stats - Obtener estadísticas globales
app.get('/api/stats', (req, res) => {
  try {
    const activeSessions = Array.from(stats.sessions.values())
      .filter(s => !s.endTime);
    
    const avgDuration = stats.totalSessions > 0 
      ? Math.round(activeSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / stats.totalSessions)
      : 0;

    res.json({
      status: 'online',
      serverStartTime: stats.serverStartTime,
      lastUpdated: stats.lastUpdated,
      uptime: Math.round((new Date() - stats.serverStartTime) / 1000),
      
      statistics: {
        totalSessions: stats.totalSessions,
        activeSessions: activeSessions.length,
        totalDetections: stats.totalDetections,
        totalFaceDetections: stats.totalFaceDetections,
        totalInteractions: stats.totalInteractions,
        avgDetectionsPerSession: stats.totalSessions > 0 
          ? Math.round(stats.totalDetections / stats.totalSessions) 
          : 0,
        avgDuration: `${avgDuration}s`
      },
      
      activeSessions: activeSessions.map(s => ({
        sessionId: s.sessionId,
        startTime: s.startTime,
        duration: Math.round((new Date() - s.startTime) / 1000),
        faceDetections: s.faceDetections,
        objectDetections: s.objectDetections,
        interactions: s.interactions,
        filters: s.filters,
        lastActivity: s.lastActivity
      })),
      
      system: {
        memory: process.memoryUsage(),
        pid: process.pid,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/stats:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas',
      success: false 
    });
  }
});

// 8️⃣ GET /api/logs - Listar archivos de log
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      return res.json({ 
        logs: [], 
        message: 'No hay logs disponibles aún',
        success: true 
      });
    }

    const logFiles = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.log'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(LOGS_DIR, a));
        const statB = fs.statSync(path.join(LOGS_DIR, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    const logs = logFiles.map(file => {
      const filePath = path.join(LOGS_DIR, file);
      const fileStat = fs.statSync(filePath);
      const fileSize = fileStat.size;
      
      return {
        name: file,
        size: `${(fileSize / 1024).toFixed(2)} KB`,
        sizeBytes: fileSize,
        lastModified: fileStat.mtime,
        created: fileStat.birthtime,
        url: `/api/logs/${encodeURIComponent(file)}`,
        downloadUrl: `/api/logs/download/${encodeURIComponent(file)}`
      };
    });

    const totalSize = logs.reduce((sum, log) => sum + log.sizeBytes, 0);
    
    res.json({ 
      success: true,
      total: logs.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      logs,
      directory: LOGS_DIR,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/logs:', error);
    res.status(500).json({ 
      error: 'Error accediendo a los logs',
      success: false 
    });
  }
});

// 9️⃣ GET /api/logs/:logFile - Ver archivo de log
app.get('/api/logs/:logFile', (req, res) => {
  try {
    const logFile = req.params.logFile;
    const decodedFileName = decodeURIComponent(logFile);
    const logPath = path.join(LOGS_DIR, decodedFileName);
    
    // Prevenir directory traversal
    if (!logPath.startsWith(path.resolve(LOGS_DIR))) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        success: false 
      });
    }

    if (!fs.existsSync(logPath) || !logFile.endsWith('.log')) {
      return res.status(404).json({ 
        error: 'Archivo de log no encontrado',
        success: false 
      });
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    res.json({
      success: true,
      fileName: decodedFileName,
      totalLines: lines.length,
      size: fs.statSync(logPath).size,
      lastModified: fs.statSync(logPath).mtime,
      content: lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return line;
        }
      }),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/logs/:logFile:', error);
    res.status(500).json({ 
      error: 'Error leyendo el archivo de log',
      success: false 
    });
  }
});

// 🔟 GET /api/logs/download/:logFile - Descargar archivo de log
app.get('/api/logs/download/:logFile', (req, res) => {
  try {
    const logFile = req.params.logFile;
    const decodedFileName = decodeURIComponent(logFile);
    const logPath = path.join(LOGS_DIR, decodedFileName);
    
    if (!logPath.startsWith(path.resolve(LOGS_DIR))) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        success: false 
      });
    }

    if (!fs.existsSync(logPath) || !logFile.endsWith('.log')) {
      return res.status(404).json({ 
        error: 'Archivo no encontrado',
        success: false 
      });
    }

    res.download(logPath, decodedFileName, (err) => {
      if (err) {
        console.error('Error descargando archivo:', err);
        res.status(500).json({ 
          error: 'Error descargando el archivo',
          success: false 
        });
      }
    });
  } catch (error) {
    console.error('Error en /api/logs/download/:logFile:', error);
    res.status(500).json({ 
      error: 'Error procesando la descarga',
      success: false 
    });
  }
});

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    success: false,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error global:', err);
  
  logToFile('SERVER_ERROR', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Error interno del servidor',
    success: false,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// EXPORTAR PARA VERCEL
// ==========================================
module.exports = app;

// ==========================================
// INICIAR SERVIDOR (desarrollo local)
// ==========================================
if (require.main === module || process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 Vision AI Pro - Backend Server v2.0                      ║
║                                                              ║
║  🌐 URL Principal: http://localhost:${PORT}                  ${PORT < 1000 ? ' ' : ''}║
║  📊 Dashboard:    http://localhost:${PORT}/api/stats         ${PORT < 1000 ? ' ' : ''}║
║  ❤️  Healthcheck: http://localhost:${PORT}/api/health        ${PORT < 1000 ? ' ' : ''}║
║                                                              ║
║  📁 Logs: ${LOGS_DIR}${' '.repeat(40 - LOGS_DIR.length)}║
║  ⚡ PID: ${process.pid}${' '.repeat(48 - process.pid.toString().length)}║
║  🛡️  Rate Limit: 100 req/15min${' '.repeat(32)}║
╚══════════════════════════════════════════════════════════════╝
    `);
  });

  // Manejo de cierre elegante
  process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM. Cerrando servidor...');
    
    logToFile('SERVER_SHUTDOWN', {
      reason: 'SIGTERM',
      timestamp: new Date().toISOString(),
      stats: {
        totalSessions: stats.totalSessions,
        totalDetections: stats.totalDetections,
        totalInteractions: stats.totalInteractions
      }
    });

    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️  Forzando cierre del servidor');
      process.exit(1);
    }, 10000);
  });
}