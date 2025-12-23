// ==========================================
// VISION AI PRO - BACKEND SERVER (VERCEL)
// ==========================================
// Autor: Tu nombre
// Fecha: Diciembre 2025
// Descripción: API Serverless para Vision AI Pro
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite por IP
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
});

app.use('/api/', apiLimiter);

// ==========================================
// INICIALIZACIÓN DE LOGS
// ==========================================
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    console.log('📁 Directorio de logs creado:', LOGS_DIR);
  }
} catch (error) {
  console.error('❌ Error creando directorio de logs:', error);
}

// ==========================================
// ALMACENAMIENTO EN MEMORIA
// ==========================================
const stats = {
  totalSessions: 0,
  totalDetections: 0,
  totalFaceDetections: 0,
  totalInteractions: 0,
  sessions: new Map(),
  serverStartTime: new Date(),
  lastUpdated: new Date()
};

// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================
function logToFile(eventType, data) {
  try {
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];
    const logFileName = `${eventType}_${dateString}.log`;
    const logPath = path.join(LOGS_DIR, logFileName);

    // Verificar tamaño del archivo
    if (fs.existsSync(logPath)) {
      const fileStats = fs.statSync(logPath);
      if (fileStats.size > MAX_LOG_FILE_SIZE) {
        const backupName = `${eventType}_${dateString}_${Date.now()}.log.backup`;
        const backupPath = path.join(LOGS_DIR, backupName);
        fs.renameSync(logPath, backupPath);
        console.log(`📦 Log archivado: ${backupName}`);
      }
    }

    const logEntry = JSON.stringify({
      timestamp: date.toISOString(),
      event: eventType,
      data: data,
      pid: process.pid
    }) + '\n';

    fs.appendFileSync(logPath, logEntry, 'utf-8');
    return true;
  } catch (error) {
    console.error('❌ Error registrando en archivo:', error);
    return false;
  }
}

function validateSession(sessionId) {
  return stats.sessions.has(sessionId);
}

// ==========================================
// RUTAS DE LA API
// ==========================================

// 1️⃣ RUTA DE SALUDO
app.get('/', (req, res) => {
  res.json({
    message: 'Vision AI Pro API - Serverless',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      api: '/api/*',
      docs: 'https://github.com/tu-usuario/vision-ai-pro',
      frontend: '/ (aplicación principal)',
      logs: '/logs.html (panel de administración)'
    },
    timestamp: new Date().toISOString()
  });
});

// 2️⃣ HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    },
    sessions: {
      total: stats.totalSessions,
      active: Array.from(stats.sessions.values()).filter(s => !s.endTime).length
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3️⃣ INICIAR SESIÓN
app.post('/api/session/start', (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || '0.0.0.0';
    
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

    // Guardar sesión
    stats.sessions.set(sessionId, sessionData);
    stats.totalSessions++;
    stats.lastUpdated = new Date();

    // Log
    logToFile('SESSION_START', {
      sessionId,
      ip,
      userAgent: userAgent.substring(0, 200),
      timestamp: sessionData.startTime.toISOString()
    });

    res.json({
      success: true,
      sessionId,
      message: 'Sesión iniciada correctamente',
      timestamp: sessionData.startTime.toISOString()
    });
  } catch (error) {
    console.error('Error en session/start:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 4️⃣ REGISTRAR DETECCIONES
app.post('/api/detection/record', (req, res) => {
  try {
    const { sessionId, faceCount = 0, objectCount = 0, confidenceLevel, detectionType } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    if (!validateSession(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    const session = stats.sessions.get(sessionId);
    const faceNum = parseInt(faceCount) || 0;
    const objectNum = parseInt(objectCount) || 0;

    // Actualizar sesión
    session.faceDetections += faceNum;
    session.objectDetections += objectNum;
    session.lastActivity = new Date();

    // Actualizar estadísticas globales
    stats.totalFaceDetections += faceNum;
    stats.totalDetections += faceNum + objectNum;
    stats.lastUpdated = new Date();

    // Log
    logToFile('DETECTION_RECORD', {
      sessionId,
      timestamp: new Date().toISOString(),
      faceCount: faceNum,
      objectCount: objectNum,
      confidenceLevel,
      detectionType
    });

    res.json({
      success: true,
      message: 'Detección registrada',
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
      success: false,
      error: 'Error procesando detección'
    });
  }
});

// 5️⃣ REGISTRAR INTERACCIONES
app.post('/api/interaction/record', (req, res) => {
  try {
    const { sessionId, widgetName, action, value } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    if (!validateSession(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    const session = stats.sessions.get(sessionId);
    
    // Actualizar sesión
    session.interactions++;
    session.lastActivity = new Date();

    if (widgetName === 'filterSelect' && value && !session.filters.includes(value)) {
      session.filters.push(value);
    }

    // Actualizar estadísticas globales
    stats.totalInteractions++;
    stats.lastUpdated = new Date();

    // Log
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
      totalInteractionsInSession: session.interactions,
      filters: session.filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en interaction/record:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando interacción'
    });
  }
});

// 6️⃣ FINALIZAR SESIÓN
app.post('/api/session/end', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    if (!validateSession(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    const session = stats.sessions.get(sessionId);
    
    // Finalizar sesión
    session.endTime = new Date();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);
    session.lastActivity = new Date();
    stats.lastUpdated = new Date();

    // Log
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

    res.json({
      success: true,
      message: 'Sesión finalizada',
      sessionStats: {
        faceDetections: session.faceDetections,
        objectDetections: session.objectDetections,
        interactions: session.interactions,
        duration: session.duration,
        filters: session.filters
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en session/end:', error);
    res.status(500).json({
      success: false,
      error: 'Error finalizando sesión'
    });
  }
});

// 7️⃣ OBTENER ESTADÍSTICAS
app.get('/api/stats', (req, res) => {
  try {
    const activeSessions = Array.from(stats.sessions.values())
      .filter(s => !s.endTime);
    
    const avgDuration = stats.totalSessions > 0 
      ? Math.round(activeSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / stats.totalSessions)
      : 0;

    res.json({
      success: true,
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
        memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        pid: process.pid,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// 8️⃣ LISTAR ARCHIVOS DE LOG
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      return res.json({
        success: true,
        logs: [],
        message: 'No hay logs disponibles aún',
        timestamp: new Date().toISOString()
      });
    }

    const logFiles = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(LOGS_DIR, file);
        const fileStats = fs.statSync(filePath);

        return {
          file,
          size: `${(fileStats.size / 1024).toFixed(2)} KB`,
          sizeBytes: fileStats.size,
          lastModified: fileStats.mtime,
          created: fileStats.birthtime,
          url: `/api/logs/${encodeURIComponent(file)}`,
          downloadUrl: `/api/logs/download/${encodeURIComponent(file)}`
        };
      })
      .sort((a, b) => b.lastModified - a.lastModified);

    const totalSize = logFiles.reduce((sum, log) => sum + log.sizeBytes, 0);
    
    res.json({
      success: true,
      total: logFiles.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      logs: logFiles,
      directory: LOGS_DIR,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error accediendo a los logs'
    });
  }
});

// 9️⃣ VER CONTENIDO DE ARCHIVO DE LOG
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

// 🔟 DESCARGAR ARCHIVO DE LOG
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

// 1️⃣1️⃣ ELIMINAR ARCHIVOS DE LOG ANTIGUOS
app.delete('/api/logs/cleanup', (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    if (!fs.existsSync(LOGS_DIR)) {
      return res.json({
        success: true,
        deleted: 0,
        message: 'No hay logs para limpiar'
      });
    }

    const logFiles = fs.readdirSync(LOGS_DIR);
    let deletedCount = 0;

    logFiles.forEach(file => {
      const filePath = path.join(LOGS_DIR, file);
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ Eliminado: ${file}`);
      }
    });

    res.json({
      success: true,
      deleted: deletedCount,
      message: `Se eliminaron ${deletedCount} archivos de log antiguos`,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando logs'
    });
  }
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  
  logToFile('SERVER_ERROR', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// EXPORT PARA VERCEL SERVERLESS
// ==========================================
module.exports = app;

// ==========================================
// INICIALIZACIÓN LOCAL (OPCIONAL)
// ==========================================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
🚀 Vision AI Pro API iniciada en puerto ${PORT}
📊 API disponible en: http://localhost:${PORT}/api
📁 Logs en: ${LOGS_DIR}
    `);
  });
}