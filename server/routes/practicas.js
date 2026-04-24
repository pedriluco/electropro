// ============================================================
// server/routes/practicas.js — CRUD de Prácticas
// ============================================================
// GET    /api/practicas           → todas las prácticas
// GET    /api/practicas/:id       → una práctica por ID
// POST   /api/practicas           → crear práctica (docente)
// PATCH  /api/practicas/:id       → actualizar (publicar, editar)
// DELETE /api/practicas/:id       → eliminar
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();
const DB      = require('../db');

// ── Helpers de validación ─────────────────────────────────────

function autoNum(count) {
  return `P-${String(count + 1).padStart(2, '0')}`;
}

// ── GET /api/practicas ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    let practicas = await DB.getPracticas();

    // El alumno solo ve las publicadas; el docente ve todas.
    // El rol viene del header (cuando implementes JWT, verifica el token).
    // Por ahora lo lees del query param: ?role=teacher
    const role = req.query.role || 'student';
    if (role === 'student') {
      practicas = practicas.filter(p => p.status === 'published');
    }

    res.json(practicas);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/practicas/:id ────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const practica = await DB.getPracticaById(req.params.id);
    if (!practica) return res.status(404).json({ error: 'Práctica no encontrada.' });
    res.json(practica);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/practicas ───────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      num, title, objective, difficulty, deliveryType,
      components, steps, circuitDiagram, codeSnippet,
      quiz, createdBy,
    } = req.body;

    // Validaciones mínimas
    if (!title?.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio.' });
    }

    // Si no viene num, generarlo automáticamente
    const practicas = await DB.getPracticas();
    const numFinal  = num?.trim() || autoNum(practicas.length);

    const saved = await DB.createPractica({
      num:            numFinal,
      title:          title.trim(),
      objective:      objective       || '',
      difficulty:     Number(difficulty) || 1,
      deliveryType:   deliveryType    || 'photo',
      components:     Array.isArray(components) ? components : [],
      steps:          Array.isArray(steps)      ? steps      : [],
      circuitDiagram: circuitDiagram  || '',
      codeSnippet:    codeSnippet     || '',
      quiz:           quiz            || null,
      createdBy:      createdBy       || 'unknown',
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/practicas/:id ──────────────────────────────────
// Permite actualizar cualquier campo, incluyendo status
// Ejemplo body para publicar: { "status": "published" }
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const practica = await DB.getPracticaById(id);
    if (!practica) return res.status(404).json({ error: 'Práctica no encontrada.' });

    // Solo actualiza los campos que vienen en el body
    const allowed = [
      'num', 'title', 'objective', 'difficulty', 'deliveryType',
      'components', 'steps', 'circuitDiagram', 'codeSnippet',
      'quiz', 'status',
    ];
    const changes = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) changes[key] = req.body[key];
    });

    const updated = await DB.updatePractica(id, changes);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/practicas/:id ─────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const practica = await DB.getPracticaById(req.params.id);
    if (!practica) return res.status(404).json({ error: 'Práctica no encontrada.' });
    await DB.deletePractica(req.params.id);
    res.json({ ok: true, message: 'Práctica eliminada.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
