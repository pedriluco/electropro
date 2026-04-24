// ============================================================
// server/routes/entregas.js — Entregas de Alumnos
// ============================================================
// GET   /api/entregas               → todas (filtros: ?studentId=&practiceId=)
// POST  /api/entregas               → registrar entrega (foto o quiz)
// PATCH /api/entregas/:id/calificar → docente califica una entrega
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();
const DB      = require('../db');

// ── GET /api/entregas ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { studentId, practiceId } = req.query;
    const entregas = await DB.getEntregas({ studentId, practiceId });
    res.json(entregas);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/entregas — Registrar entrega ────────────────────
// Body para foto:
//   { practiceId, studentId, studentName, type: 'photo', fileUrl: '/uploads/abc.jpg' }
// Body para quiz:
//   { practiceId, studentId, studentName, type: 'quiz', quizAnswers: [0,2,1,...], quizScore: 4 }
//
// NOTA: el archivo físico ya debe estar subido antes de llamar
// a este endpoint (lo sube la ruta POST /api/materiales con multer,
// o puedes agregar un endpoint de upload separado).
// El frontend envía la URL que devuelve el servidor, no el base64.
router.post('/', async (req, res, next) => {
  try {
    const { practiceId, studentId, studentName, type, fileUrl, quizAnswers, quizScore } = req.body;

    // Validaciones
    if (!practiceId || !studentId || !type) {
      return res.status(400).json({ error: 'practiceId, studentId y type son obligatorios.' });
    }
    if (type !== 'photo' && type !== 'quiz') {
      return res.status(400).json({ error: 'type debe ser "photo" o "quiz".' });
    }
    if (type === 'photo' && !fileUrl) {
      return res.status(400).json({ error: 'fileUrl es obligatorio para entregas de foto.' });
    }

    // Verificar que no exista ya una entrega del mismo tipo para esta práctica
    const existing = await DB.getEntregas({ studentId, practiceId });
    const duplicate = existing.find(e => e.type === type);
    if (duplicate) {
      return res.status(409).json({ error: 'Ya existe una entrega de este tipo para esta práctica.' });
    }

    const entrega = await DB.createEntrega({
      practiceId,
      studentId,
      studentName: studentName || 'Alumno',
      type,
      fileUrl:     fileUrl     ?? null,
      quizAnswers: quizAnswers ?? null,
      quizScore:   quizScore   ?? null,
    });

    res.status(201).json(entrega);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/entregas/:id/calificar — Docente califica ──────
// Body: { grade: 8.5, feedback: "Buen trabajo, pero..." }
router.patch('/:id/calificar', async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;

    if (grade === undefined || grade === null) {
      return res.status(400).json({ error: 'La calificación es obligatoria.' });
    }
    if (Number(grade) < 0 || Number(grade) > 10) {
      return res.status(400).json({ error: 'La calificación debe ser entre 0 y 10.' });
    }

    const updated = await DB.calificarEntrega(req.params.id, {
      grade:    Number(grade),
      feedback: feedback?.trim() || '',
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
