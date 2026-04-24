// ============================================================
// server/routes/materiales.js — Repositorio de Materiales
// ============================================================
// GET    /api/materiales        → lista de materiales
// POST   /api/materiales        → subir material (multipart/form-data)
// DELETE /api/materiales/:id    → eliminar material
//
// Usa multer para recibir el archivo físico y guardarlo en /uploads.
// El frontend recibe la URL del archivo y la usa directamente
// (en vez de enviar base64 como hacía antes).
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const DB      = require('../db');

// ── Configuración de multer ───────────────────────────────────

const ALLOWED_EXTENSIONS = ['.pdf', '.mp4', '.mov', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.ino'];
const MAX_SIZE_BYTES      = 50 * 1024 * 1024; // 50 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', process.env.UPLOADS_DIR || 'uploads');
    // Crea la carpeta si no existe
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Nombre único: timestamp + nombre original sanitizado
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Extensión "${ext}" no permitida.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

// ── GET /api/materiales ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const materiales = await DB.getMateriales();
    res.json(materiales);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/materiales — Subir material ─────────────────────
// Espera multipart/form-data con:
//   file        → el archivo físico
//   name        → nombre descriptivo (opcional, default: nombre del archivo)
//   category    → 'pdf' | 'video' | 'code' | 'image'
//   practiceId  → ID de práctica relacionada (opcional)
//   uploadedBy  → ID del docente
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const ext      = path.extname(req.file.originalname).toLowerCase();
    const fileUrl  = `/uploads/${req.file.filename}`;   // URL pública del archivo
    const category = req.body.category || detectCategory(ext);

    const material = await DB.createMaterial({
      name:       req.body.name?.trim() || req.file.originalname,
      ext,
      sizeBytes:  req.file.size,
      category,
      practiceId: req.body.practiceId || null,
      uploadedBy: req.body.uploadedBy || 'unknown',
      fileUrl,
    });

    res.status(201).json(material);
  } catch (err) {
    // Si multer lanzó error de tamaño o tipo, lo formateamos bien
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo supera el límite de 50 MB.' });
    }
    next(err);
  }
});

// ── DELETE /api/materiales/:id ────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const materiales = await DB.getMateriales();
    const material   = materiales.find(m => m.id === req.params.id);
    if (!material) return res.status(404).json({ error: 'Material no encontrado.' });

    // Borrar el archivo físico del disco
    const filePath = path.join(__dirname, '..', '..', material.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await DB.deleteMaterial(req.params.id);
    res.json({ ok: true, message: 'Material eliminado.' });
  } catch (err) {
    next(err);
  }
});

// ── Helper: detectar categoría por extensión ──────────────────
function detectCategory(ext) {
  if (ext === '.pdf')                              return 'pdf';
  if (['.mp4', '.mov'].includes(ext))             return 'video';
  if (ext === '.ino')                             return 'code';
  if (['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(ext)) return 'image';
  return 'other';
}

module.exports = router;
