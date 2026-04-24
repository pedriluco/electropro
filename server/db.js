// ============================================================
// server/db.js — Capa de Base de Datos
// ============================================================
//
// ESTE ES EL ÚNICO ARCHIVO QUE DEBES MODIFICAR
// cuando conectes tu base de datos real.
//
// Ahora mismo todo se guarda en memoria (se borra al
// reiniciar el servidor). Cuando tengas tu BD lista:
//
//   1. Instala el driver que necesites:
//        MySQL:      npm install mysql2
//        PostgreSQL: npm install pg
//        MongoDB:    npm install mongoose
//        SQLite:     npm install better-sqlite3
//
//   2. Reemplaza el cuerpo de cada función con tu query.
//      El resto del servidor NO cambia.
//
// CONVENCIÓN:
//   Cada función devuelve una Promise que resuelve con
//   los datos o lanza un Error si algo falla.
//   Las rutas capturan ese error y responden 500.
//
// ============================================================
//
// EJEMPLO CON MySQL2 (cuando lo tengas listo):
//
//   const mysql = require('mysql2/promise');
//
//   // ── REEMPLAZAR en la parte de CONFIG ─────────────────
//   const pool = mysql.createPool({
//     host:     process.env.DB_HOST,
//     port:     process.env.DB_PORT || 3306,
//     user:     process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//   });
//   // ─────────────────────────────────────────────────────
//
//   // Luego en cada función, por ejemplo getPracticas():
//   getPracticas: async () => {
//     // ── REEMPLAZAR ────────────────────────────────────
//     const [rows] = await pool.query('SELECT * FROM practicas');
//     return rows;
//     // ─────────────────────────────────────────────────
//   },
//
// EJEMPLO CON PostgreSQL (pg):
//
//   const { Pool } = require('pg');
//   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//
//   getPracticas: async () => {
//     const { rows } = await pool.query('SELECT * FROM practicas');
//     return rows;
//   },
//
// EJEMPLO CON SQLite (better-sqlite3, síncrono):
//
//   const Database = require('better-sqlite3');
//   const db = new Database('./db/electro_lab.db');
//
//   getPracticas: async () => {
//     return db.prepare('SELECT * FROM practicas').all();
//   },
//
// ============================================================

'use strict';

const { randomUUID } = require('crypto');

// ── Datos en memoria ─────────────────────────────────────────
// Estas variables son el "storage" mientras no hay BD real.
// Se pierden al reiniciar el servidor.
// Cuando conectes tu BD, estos arrays ya no se usan.

let _practicas   = [];
let _alumnos     = [];
let _entregas    = [];
let _materiales  = [];

// ── Helper para generar IDs únicos ───────────────────────────
// En producción con MySQL/Postgres puedes usar AUTO_INCREMENT
// o SERIAL, y el servidor devuelve el id generado.
// Con MongoDB/Firestore el id lo asigna la propia BD.
function newId() {
  return randomUUID();   // genera UUID v4 estándar
}

// ============================================================
// DB — objeto con todos los métodos de acceso a datos
// ============================================================

const DB = {

  // ──────────────────────────────────────────────────────────
  // PRÁCTICAS
  // ──────────────────────────────────────────────────────────

  /**
   * Devuelve todas las prácticas.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query('SELECT * FROM practicas ORDER BY created_at DESC');
   *   return rows;
   */
  getPracticas: async () => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _practicas;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Crea una práctica nueva.
   * @param {object} data  campos validados por la ruta
   *
   * REEMPLAZAR con:
   *   const [result] = await pool.query(
   *     `INSERT INTO practicas (num, title, objective, difficulty,
   *      delivery_type, components, steps, circuit_diagram,
   *      code_snippet, status, created_by)
   *      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
   *     [data.num, data.title, data.objective, data.difficulty,
   *      data.deliveryType, JSON.stringify(data.components),
   *      JSON.stringify(data.steps), data.circuitDiagram,
   *      data.codeSnippet, data.createdBy]
   *   );
   *   return DB.getPracticaById(result.insertId);
   */
  createPractica: async (data) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const record = {
      id:             newId(),
      num:            data.num,
      title:          data.title,
      objective:      data.objective      || '',
      difficulty:     data.difficulty     || 1,
      deliveryType:   data.deliveryType   || 'photo',
      components:     data.components     || [],
      steps:          data.steps          || [],
      circuitDiagram: data.circuitDiagram || '',
      codeSnippet:    data.codeSnippet    || '',
      quiz:           data.quiz           || null,
      status:         'draft',
      createdBy:      data.createdBy,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };
    _practicas.push(record);
    return record;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Obtiene una práctica por su ID.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query('SELECT * FROM practicas WHERE id = ?', [id]);
   *   return rows[0] ?? null;
   */
  getPracticaById: async (id) => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _practicas.find(p => p.id === id) ?? null;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Actualiza campos de una práctica.
   * @param {string} id
   * @param {object} changes  solo los campos que cambian
   *
   * REEMPLAZAR con:
   *   await pool.query(
   *     'UPDATE practicas SET status = ?, updated_at = NOW() WHERE id = ?',
   *     [changes.status, id]
   *   );
   *   return DB.getPracticaById(id);
   */
  updatePractica: async (id, changes) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _practicas.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Práctica ${id} no encontrada`);
    _practicas[idx] = { ..._practicas[idx], ...changes, updatedAt: new Date().toISOString() };
    return _practicas[idx];
    // ─────────────────────────────────────────────────────
  },

  /**
   * Elimina una práctica.
   *
   * REEMPLAZAR con:
   *   await pool.query('DELETE FROM practicas WHERE id = ?', [id]);
   */
  deletePractica: async (id) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _practicas.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Práctica ${id} no encontrada`);
    _practicas.splice(idx, 1);
    // ─────────────────────────────────────────────────────
  },

  // ──────────────────────────────────────────────────────────
  // ALUMNOS
  // ──────────────────────────────────────────────────────────

  /**
   * Devuelve todos los alumnos activos.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query(
   *     'SELECT * FROM alumnos WHERE active = 1 ORDER BY name ASC'
   *   );
   *   return rows;
   */
  getAlumnos: async () => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _alumnos.filter(a => a.active !== false);
    // ─────────────────────────────────────────────────────
  },

  /**
   * Inscribe un alumno nuevo.
   *
   * REEMPLAZAR con:
   *   const [result] = await pool.query(
   *     'INSERT INTO alumnos (name, email, matricula, `group`) VALUES (?, ?, ?, ?)',
   *     [data.name, data.email, data.matricula, data.group]
   *   );
   *   return DB.getAlumnoById(result.insertId);
   */
  createAlumno: async (data) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const record = {
      id:        newId(),
      name:      data.name,
      email:     data.email     || '',
      matricula: data.matricula,
      group:     data.group     || 'G1',
      active:    true,
      createdAt: new Date().toISOString(),
    };
    _alumnos.push(record);
    return record;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Obtiene un alumno por su ID.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query('SELECT * FROM alumnos WHERE id = ?', [id]);
   *   return rows[0] ?? null;
   */
  getAlumnoById: async (id) => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _alumnos.find(a => a.id === id) ?? null;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Verifica si ya existe un alumno con esa matrícula.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query(
   *     'SELECT id FROM alumnos WHERE LOWER(matricula) = LOWER(?)', [matricula]
   *   );
   *   return rows.length > 0;
   */
  matriculaExists: async (matricula) => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _alumnos.some(a => a.matricula?.toLowerCase() === matricula.toLowerCase());
    // ─────────────────────────────────────────────────────
  },

  /**
   * Actualiza datos de un alumno.
   *
   * REEMPLAZAR con:
   *   await pool.query(
   *     'UPDATE alumnos SET name = ?, email = ?, `group` = ? WHERE id = ?',
   *     [changes.name, changes.email, changes.group, id]
   *   );
   *   return DB.getAlumnoById(id);
   */
  updateAlumno: async (id, changes) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _alumnos.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Alumno ${id} no encontrado`);
    _alumnos[idx] = { ..._alumnos[idx], ...changes };
    return _alumnos[idx];
    // ─────────────────────────────────────────────────────
  },

  /**
   * Da de baja a un alumno (marca active=false).
   * Se recomienda esto en lugar de borrar para conservar
   * el historial de entregas del alumno.
   *
   * REEMPLAZAR con:
   *   await pool.query('UPDATE alumnos SET active = 0 WHERE id = ?', [id]);
   *
   * Si prefieres borrar permanentemente:
   *   await pool.query('DELETE FROM alumnos WHERE id = ?', [id]);
   */
  deleteAlumno: async (id) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _alumnos.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Alumno ${id} no encontrado`);
    _alumnos[idx].active = false;   // soft delete — conserva historial
    // ─────────────────────────────────────────────────────
  },

  // ──────────────────────────────────────────────────────────
  // ENTREGAS
  // ──────────────────────────────────────────────────────────

  /**
   * Devuelve entregas, opcionalmente filtradas.
   *
   * REEMPLAZAR con:
   *   let q = 'SELECT * FROM entregas WHERE 1=1';
   *   const params = [];
   *   if (filters.studentId)  { q += ' AND student_id = ?';  params.push(filters.studentId); }
   *   if (filters.practiceId) { q += ' AND practice_id = ?'; params.push(filters.practiceId); }
   *   const [rows] = await pool.query(q, params);
   *   return rows;
   */
  getEntregas: async (filters = {}) => {
    // ── EN MEMORIA ───────────────────────────────────────
    let list = _entregas;
    if (filters.studentId)  list = list.filter(e => e.studentId  === filters.studentId);
    if (filters.practiceId) list = list.filter(e => e.practiceId === filters.practiceId);
    return list;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Registra una entrega nueva.
   *
   * REEMPLAZAR con:
   *   const [result] = await pool.query(
   *     `INSERT INTO entregas (practice_id, student_id, student_name,
   *      type, file_url, quiz_answers, quiz_score)
   *      VALUES (?, ?, ?, ?, ?, ?, ?)`,
   *     [data.practiceId, data.studentId, data.studentName,
   *      data.type, data.fileUrl ?? null,
   *      JSON.stringify(data.quizAnswers ?? null), data.quizScore ?? null]
   *   );
   *   return DB.getEntregaById(result.insertId);
   */
  createEntrega: async (data) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const record = {
      id:          newId(),
      practiceId:  data.practiceId,
      studentId:   data.studentId,
      studentName: data.studentName,
      type:        data.type,
      fileUrl:     data.fileUrl     ?? null,   // URL del archivo en uploads/
      quizAnswers: data.quizAnswers ?? null,
      quizScore:   data.quizScore   ?? null,
      grade:       null,
      feedback:    null,
      submittedAt: new Date().toISOString(),
      gradedAt:    null,
    };
    _entregas.push(record);
    return record;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Guarda la calificación del docente.
   *
   * REEMPLAZAR con:
   *   await pool.query(
   *     'UPDATE entregas SET grade = ?, feedback = ?, graded_at = NOW() WHERE id = ?',
   *     [grade, feedback, id]
   *   );
   *   return DB.getEntregaById(id);
   */
  calificarEntrega: async (id, { grade, feedback }) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _entregas.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Entrega ${id} no encontrada`);
    _entregas[idx] = { ..._entregas[idx], grade, feedback, gradedAt: new Date().toISOString() };
    return _entregas[idx];
    // ─────────────────────────────────────────────────────
  },

  // ──────────────────────────────────────────────────────────
  // MATERIALES
  // ──────────────────────────────────────────────────────────

  /**
   * Devuelve todos los materiales.
   *
   * REEMPLAZAR con:
   *   const [rows] = await pool.query('SELECT * FROM materiales ORDER BY uploaded_at DESC');
   *   return rows;
   */
  getMateriales: async () => {
    // ── EN MEMORIA ───────────────────────────────────────
    return _materiales;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Guarda un material nuevo.
   * fileUrl es la ruta local en /uploads o la URL del CDN.
   *
   * REEMPLAZAR con:
   *   const [result] = await pool.query(
   *     `INSERT INTO materiales (name, ext, size_bytes, category,
   *      practice_id, uploaded_by, file_url)
   *      VALUES (?, ?, ?, ?, ?, ?, ?)`,
   *     [data.name, data.ext, data.sizeBytes, data.category,
   *      data.practiceId ?? null, data.uploadedBy, data.fileUrl]
   *   );
   *   return DB.getMaterialById(result.insertId);
   */
  createMaterial: async (data) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const record = {
      id:          newId(),
      name:        data.name,
      ext:         data.ext,
      sizeBytes:   data.sizeBytes,
      category:    data.category,
      practiceId:  data.practiceId  ?? null,
      uploadedBy:  data.uploadedBy,
      fileUrl:     data.fileUrl,               // ruta en /uploads
      uploadedAt:  new Date().toISOString(),
    };
    _materiales.push(record);
    return record;
    // ─────────────────────────────────────────────────────
  },

  /**
   * Elimina un material.
   *
   * REEMPLAZAR con:
   *   await pool.query('DELETE FROM materiales WHERE id = ?', [id]);
   */
  deleteMaterial: async (id) => {
    // ── EN MEMORIA ───────────────────────────────────────
    const idx = _materiales.findIndex(m => m.id === id);
    if (idx === -1) throw new Error(`Material ${id} no encontrado`);
    _materiales.splice(idx, 1);
    // ─────────────────────────────────────────────────────
  },

};

module.exports = DB;
