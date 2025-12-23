// ==========================================
// VISION AI PRO - BACKEND PARA VERCEL
// ==========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ==========================================
// CONFIGURACIÓN BÁSICA
// ==========================================
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la raíz
app.use(express.static(path.join(__dirname, '..')));

// ==========================================
// DATOS EN MEMORIA
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
// RUTAS PRINCIPALES
// ==========================================

// 1. RUTA RAIZ - Servir el frontend
app.get('/', (req, res) => {
  try {
    // Intentar servir el index.html desde public/
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ Sirviendo index.html desde:', indexPath);
      return res.sendFile(indexPath);
    }
    
    // Si no existe, mostrar dashboard de API
    console.log('⚠️ index.html no encontrado, sirviendo dashboard API');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vision AI Pro - API Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            min-height: 100vh;
            padding: 2rem;
          }
          .container { max-width: 800px; margin: 0 auto; }
          header { text-align: center; margin-bottom: 3rem; }
          h1 {
            font-size: 3rem;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin-bottom: 1rem;
          }
          .status {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 50px;
            font-weight: bold;
            margin-bottom: 2rem;
          }
          .card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-block;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            margin: 0.5rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            font-size: 1rem;
          }
          .btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }
          .endpoint {
            background: #1e293b;
            padding: 1rem;
            border-radius: 8px;
            margin: 0.5rem 0;
            border-left: 4px solid #3b82f6;
          }
          .endpoint-method {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 1rem;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 1.5rem 0;
          }
          .stat {
            background: rgba(15, 23, 42, 0.8);
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
          }
          .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #60a5fa;
          }
          .stat-label {
            font-size: 0.875rem;
            color: #94a3b8;
            margin-top: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🤖 Vision AI Pro</h1>
            <div class="status">✅ API funcionando correctamente</div>
            <p>Backend serverless desplegado en Vercel</p>
          </header>
          
          <div class="card">
            <h2 style="color: #60a5fa; margin-bottom: 1rem;">📊 Estadísticas del Sistema</h2>
            <div class="stats-grid">
              <div class="stat">
                <div class="stat-value" id="totalSessions">${stats.totalSessions}</div>
                <div class="stat-label">Sesiones</div>
              </div>
              <div class="stat">
                <div class="stat-value" id="totalDetections">${stats.totalDetections}</div>
                <div class="stat-label">Detecciones</div>
              </div>
              <div class="stat">
                <div class="stat-value" id="totalInteractions">${stats.totalInteractions}</div>
                <div class="stat-label">Interacciones</div>
              </div>
              <div class="stat">
                <div class="stat-value">${Array.from(stats.sessions.values()).filter(s => !s.endTime).length}</div>
                <div class="stat-label">Activas</div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h2 style="color: #60a5fa; margin-bottom: 1rem;">🚀 Acciones Rápidas</h2>
            <div style="margin-bottom: 1.5rem;">
              <a href="/api/health" class="btn">🩺 Health Check</a>
              <a href="/api/stats" class="btn">📈 Ver Estadísticas</a>
              <a href="/api/logs" class="btn">📋 Ver Logs</a>
              <button onclick="testSession()" class="btn">🧪 Probar API</button>
            </div>
          </div>
          
          <div class="card">
            <h2 style="color: #60a5fa; margin-bottom: 1rem;">📡 Endpoints API</h2>
            <div class="endpoint">
              <span class="endpoint-method">GET</span>
              <strong>/api/health</strong> - Verificar estado del servidor
            </div>
            <div class="endpoint">
              <span class="endpoint-method">GET</span>
              <strong>/api/stats</strong> - Obtener estadísticas globales
            </div>
            <div class="endpoint">
              <span class="endpoint-method">GET</span>
              <strong>/api/logs</strong> - Listar archivos de log
            </div>
            <div class="endpoint">
              <span class="endpoint-method">POST</span>
              <strong>/api/session/start</strong> - Iniciar sesión
            </div>
            <div class="endpoint">
              <span class="endpoint-method">POST</span>
              <strong>/api/detection/record</strong> - Registrar detecciones
            </div>
            <div class="endpoint">
              <span class="endpoint-method">POST</span>
              <strong>/api/interaction/record</strong> - Registrar interacciones
            </div>
            <div class="endpoint">
              <span class="endpoint-method">POST</span>
              <strong>/api/session/end</strong> - Finalizar sesión
            </div>
          </div>
          
          <div class="card">
            <h2 style="color: #60a5fa; margin-bottom: 1rem;">🔧 Información Técnica</h2>
            <p><strong>URL Base:</strong> ${req.protocol}://${req.get('host')}</p>
            <p><strong>Entorno:</strong> ${process.env.NODE_ENV || 'production'}</p>
            <p><strong>Tiempo activo:</strong> <span id="uptime">0</span> segundos</p>
            <p><strong>Memoria:</strong> <span id="memory">Cargando...</span></p>
          </div>
        </div>
        
        <script>
          // Actualizar estadísticas dinámicamente
          async function updateStats() {
            try {
              const response = await fetch('/api/stats');
              const data = await response.json();
              
              document.getElementById('totalSessions').textContent = data.statistics?.totalSessions || 0;
              document.getElementById('totalDetections').textContent = data.statistics?.totalDetections || 0;
              document.getElementById('totalInteractions').textContent = data.statistics?.totalInteractions || 0;
              document.getElementById('uptime').textContent = data.uptime || 0;
              
              if (data.system?.memory) {
                document.getElementById('memory').textContent = data.system.memory;
              }
            } catch (error) {
              console.log('Error actualizando stats:', error);
            }
          }
          
          // Probar la API
          async function testSession() {
            try {
              const btn = event.target;
              btn.disabled = true;
              btn.innerHTML = '⏳ Probando...';
              
              // 1. Iniciar sesión
              const startRes = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const startData = await startRes.json();
              
              if (!startData.success) throw new Error('Error iniciando sesión');
              
              const sessionId = startData.sessionId;
              
              // 2. Registrar detección
              await fetch('/api/detection/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  faceCount: 2,
                  objectCount: 5,
                  confidenceLevel: 0.85,
                  detectionType: 'test'
                })
              });
              
              // 3. Registrar interacción
              await fetch('/api/interaction/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  widgetName: 'filterSelect',
                  action: 'click',
                  value: 'blur'
                })
              });
              
              // 4. Finalizar sesión
              await fetch('/api/session/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
              });
              
              btn.innerHTML = '✅ ¡Prueba exitosa!';
              updateStats();
              
              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '🧪 Probar API';
              }, 2000);
              
            } catch (error) {
              alert('Error en prueba: ' + error.message);
              event.target.disabled = false;
              event.target.innerHTML = '🧪 Probar API';
            }
          }
          
          // Actualizar al cargar y cada 10 segundos
          updateStats();
          setInterval(updateStats, 10000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en ruta /:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// 2. RUTA LOGS - Servir el panel de logs
app.get('/logs.html', (req, res) => {
  try {
    const logsPath = path.join(__dirname, '..', 'public', 'logs.html');
    
    if (fs.existsSync(logsPath)) {
      return res.sendFile(logsPath);
    }
    
    // Si no existe, mostrar logs básicos
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logs - Vision AI Pro</title>
        <style>
          body { font-family: Arial; background: #0f172a; color: white; padding: 20px; }
          h1 { color: #3b82f6; }
          .log-entry { background: #1e293b; padding: 15px; margin: 10px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>📊 Logs del Sistema</h1>
        <p>El archivo logs.html no se encontró. Aquí tienes una vista básica:</p>
        <div id="logs"></div>
        <script>
          async function loadLogs() {
            try {
              const response = await fetch('/api/logs');
              const data = await response.json();
              document.getElementById('logs').innerHTML = 
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('logs').innerHTML = 'Error: ' + error.message;
            }
          }
          loadLogs();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error cargando logs');
  }
});

// ==========================================
// RUTAS API
// ==========================================

// 3. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    server: 'Vision AI Pro API',
    environment: process.env.NODE_ENV || 'production',
    nodeVersion: process.version
  });
});

// 4. INICIAR SESIÓN
app.post('/api/session/start', (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData = {
      sessionId,
      startTime: new Date(),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.connection.remoteAddress,
      faceDetections: 0,
      objectDetections: 0,
      interactions: 0,
      filters: []
    };

    stats.sessions.set(sessionId, sessionData);
    stats.totalSessions++;
    stats.lastUpdated = new Date();

    console.log('✅ Sesión iniciada:', sessionId);

    res.json({
      success: true,
      sessionId,
      message: 'Sesión iniciada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en session/start:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 5. REGISTRAR DETECCIONES
app.post('/api/detection/record', (req, res) => {
  try {
    const { sessionId, faceCount = 0, objectCount = 0, confidenceLevel, detectionType } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    session.faceDetections += parseInt(faceCount) || 0;
    session.objectDetections += parseInt(objectCount) || 0;
    session.lastActivity = new Date();

    stats.totalFaceDetections += parseInt(faceCount) || 0;
    stats.totalDetections += (parseInt(faceCount) || 0) + (parseInt(objectCount) || 0);
    stats.lastUpdated = new Date();

    console.log('✅ Detección registrada para sesión:', sessionId);

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
    console.error('❌ Error en detection/record:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando detección'
    });
  }
});

// 6. REGISTRAR INTERACCIONES
app.post('/api/interaction/record', (req, res) => {
  try {
    const { sessionId, widgetName, action, value } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    session.interactions++;
    session.lastActivity = new Date();

    if (widgetName === 'filterSelect' && value && !session.filters.includes(value)) {
      session.filters.push(value);
    }

    stats.totalInteractions++;
    stats.lastUpdated = new Date();

    console.log('✅ Interacción registrada para sesión:', sessionId);

    res.json({
      success: true,
      message: 'Interacción registrada',
      totalInteractionsInSession: session.interactions,
      filters: session.filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en interaction/record:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando interacción'
    });
  }
});

// 7. FINALIZAR SESIÓN
app.post('/api/session/end', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    const session = stats.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    session.endTime = new Date();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);
    session.lastActivity = new Date();
    stats.lastUpdated = new Date();

    console.log('✅ Sesión finalizada:', sessionId);

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
    console.error('❌ Error en session/end:', error);
    res.status(500).json({
      success: false,
      error: 'Error finalizando sesión'
    });
  }
});

// 8. OBTENER ESTADÍSTICAS
app.get('/api/stats', (req, res) => {
  try {
    const activeSessions = Array.from(stats.sessions.values())
      .filter(s => !s.endTime).length;

    res.json({
      success: true,
      status: 'online',
      serverStartTime: stats.serverStartTime,
      lastUpdated: stats.lastUpdated,
      uptime: Math.round((new Date() - stats.serverStartTime) / 1000),
      
      statistics: {
        totalSessions: stats.totalSessions,
        activeSessions: activeSessions,
        totalDetections: stats.totalDetections,
        totalFaceDetections: stats.totalFaceDetections,
        totalInteractions: stats.totalInteractions,
        avgDetectionsPerSession: stats.totalSessions > 0 
          ? Math.round(stats.totalDetections / stats.totalSessions) 
          : 0
      },
      
      system: {
        memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        pid: process.pid,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en /api/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// 9. OBTENER LOGS (versión simple)
app.get('/api/logs', (req, res) => {
  try {
    res.json({
      success: true,
      logs: [],
      message: 'Logs no implementados en esta versión básica',
      serverLogs: [
        `Servidor iniciado: ${stats.serverStartTime.toISOString()}`,
        `Total sesiones: ${stats.totalSessions}`,
        `Total detecciones: ${stats.totalDetections}`,
        `Total interacciones: ${stats.totalInteractions}`,
        `Última actualización: ${stats.lastUpdated.toISOString()}`
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo logs'
    });
  }
});

// ==========================================
// RUTA CATCH-ALL PARA SPA
// ==========================================
app.get('*', (req, res) => {
  // Si es una ruta API, devolver 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Ruta API no encontrada',
      path: req.path
    });
  }
  
  // Para cualquier otra ruta, intentar servir index.html
  try {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    
    // Si no existe, redirigir a la raíz
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error interno del servidor');
  }
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// EXPORT PARA VERCEL
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
🌐 http://localhost:${PORT}
📊 API: http://localhost:${PORT}/api/health
    `);
  });
}