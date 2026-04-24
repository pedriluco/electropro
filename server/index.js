// ============================================================
// server/index.js — Servidor principal Express
// ============================================================
// Arranca con:  node server/index.js
// Dev con:      npm run dev   (requiere nodemon)
//
// Estructura de rutas:
//   GET/POST/PATCH/DELETE /api/practicas
//   GET/POST/PATCH/DELETE /api/alumnos
//   GET/POST/PATCH        /api/entregas
//   GET/POST/DELETE       /api/materiales
//   POST                  /api/auth/login
//   GET                   /* → sirve public/index.html
// ============================================================

'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

// Importar routers
const practicasRouter  = require('./routes/practicas');
const alumnosRouter    = require('./routes/alumnos');
const entregasRouter   = require('./routes/entregas');
const materialesRouter = require('./routes/materiales');
const authRouter       = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────

// Habilita CORS para que el frontend pueda hacer fetch al backend
// En producción restringe origin a tu dominio real
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsear JSON en el body de las peticiones
app.use(express.json({ limit: '60mb' }));        // 60MB para base64 de fotos
app.use(express.urlencoded({ extended: true }));

// ── Carpeta de uploads ────────────────────────────────────────
// Los archivos subidos se guardan aquí en disco.
// En producción reemplaza esto con tu CDN / bucket S3.
const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Expone los archivos subidos como archivos estáticos
// Accesibles en: http://localhost:3000/uploads/nombre-del-archivo
app.use('/uploads', express.static(uploadsDir));

// ── Archivos estáticos del frontend ──────────────────────────
// El HTML y JS del cliente van en la carpeta /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Rutas de la API ───────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/practicas',  practicasRouter);
app.use('/api/alumnos',    alumnosRouter);
app.use('/api/entregas',   entregasRouter);
app.use('/api/materiales', materialesRouter);

// ── Ruta catch-all → devuelve el frontend para SPA ───────────
// Cualquier ruta que no sea /api/* carga index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Manejador de errores global ───────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ElectroLab Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ Electro-Lab Digital corriendo en http://localhost:${PORT}`);
  console.log(`   API disponible en http://localhost:${PORT}/api`);
  console.log(`   Archivos en      http://localhost:${PORT}/uploads\n`);
});

module.exports = app;
