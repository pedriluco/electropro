// ============================================================
// server/routes/alumnos.js — Gestión de Alumnos
// ============================================================
// GET    /api/alumnos        → lista de alumnos activos
// GET    /api/alumnos/:id    → un alumno por ID
// POST   /api/alumnos        → inscribir alumno nuevo
// PATCH  /api/alumnos/:id    → editar datos del alumno
// DELETE /api/alumnos/:id    → dar de baja (soft delete)
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();
const DB      = require('../db');

// ── GET /api/alumnos ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const alumnos = await DB.getAlumnos();
    res.json(alumnos);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/alumnos/:id ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const alumno = await DB.getAlumnoById(req.params.id);
    if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });
    res.json(alumno);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/alumnos — Inscribir alumno ──────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, email, matricula, group } = req.body;

    // Validaciones
    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    if (!matricula?.trim()) {
      return res.status(400).json({ error: 'La matrícula es obligatoria.' });
    }

    // Verificar matrícula duplicada
    const existe = await DB.matriculaExists(matricula.trim());
    if (existe) {
      return res.status(409).json({ error: `La matrícula ${matricula} ya está registrada.` });
    }

    const alumno = await DB.createAlumno({
      name:      name.trim(),
      email:     email?.trim()     || '',
      matricula: matricula.trim(),
      group:     group?.trim()     || 'G1',
    });

    res.status(201).json(alumno);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/alumnos/:id — Editar datos ────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const alumno = await DB.getAlumnoById(req.params.id);
    if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });

    const allowed = ['name', 'email', 'group', 'active'];
    const changes = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) changes[key] = req.body[key];
    });

    const updated = await DB.updateAlumno(req.params.id, changes);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/alumnos/:id — Dar de baja ────────────────────
// No borra al alumno, solo marca active=false (soft delete).
// Sus entregas se conservan en el historial.
router.delete('/:id', async (req, res, next) => {
  try {
    const alumno = await DB.getAlumnoById(req.params.id);
    if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });
    await DB.deleteAlumno(req.params.id);
    res.json({ ok: true, message: `"${alumno.name}" dado de baja.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
