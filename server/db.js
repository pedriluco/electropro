
'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DB = {

  getPracticas: async () => {
    const { rows } = await pool.query(
      'SELECT * FROM practicas ORDER BY created_at DESC'
    );
    return rows;
  },

  getPracticaById: async (id) => {
    const { rows } = await pool.query(
      'SELECT * FROM practicas WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  createPractica: async (data) => {
    const { rows } = await pool.query(
      `INSERT INTO practicas
       (num, title, objective, difficulty, delivery_type,
        components, steps, circuit_diagram, code_snippet,
        quiz, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.num,
        data.title,
        data.objective || '',
        data.difficulty || 1,
        data.deliveryType || 'photo',
        JSON.stringify(data.components || []),
        JSON.stringify(data.steps || []),
        data.circuitDiagram || '',
        data.codeSnippet || '',
        data.quiz ? JSON.stringify(data.quiz) : null,
        data.status || 'draft',
        data.createdBy || '',
      ]
    );
    return rows[0];
  },

  updatePractica: async (id, changes) => {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key in changes) {
      fields.push(`${key} = $${i}`);
      values.push(changes[key]);
      i++;
    }

    if (!fields.length) return DB.getPracticaById(id);

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE practicas SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING *`,
      values
    );

    return rows[0];
  },

  deletePractica: async (id) => {
    await pool.query('DELETE FROM practicas WHERE id = $1', [id]);
  },

  getAlumnos: async () => {
    const { rows } = await pool.query(
      'SELECT * FROM alumnos WHERE active = true ORDER BY name ASC'
    );
    return rows;
  },

  getAlumnoById: async (id) => {
    const { rows } = await pool.query(
      'SELECT * FROM alumnos WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  matriculaExists: async (matricula) => {
    const { rows } = await pool.query(
      'SELECT id FROM alumnos WHERE LOWER(matricula) = LOWER($1)',
      [matricula]
    );
    return rows.length > 0;
  },

  createAlumno: async (data) => {
    const { rows } = await pool.query(
      `INSERT INTO alumnos (name, email, matricula, grp)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [
        data.name,
        data.email || '',
        data.matricula,
        data.group || 'G1',
      ]
    );
    return rows[0];
  },

  updateAlumno: async (id, changes) => {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key in changes) {
      fields.push(`${key} = $${i}`);
      values.push(changes[key]);
      i++;
    }

    if (!fields.length) return DB.getAlumnoById(id);

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE alumnos SET ${fields.join(', ')}
       WHERE id = $${i}
       RETURNING *`,
      values
    );

    return rows[0];
  },

  deleteAlumno: async (id) => {
    await pool.query(
      'UPDATE alumnos SET active = false WHERE id = $1',
      [id]
    );
  },

  getEntregas: async (filters = {}) => {
    let query = 'SELECT * FROM entregas WHERE 1=1';
    const values = [];
    let i = 1;

    if (filters.studentId) {
      query += ` AND student_id = $${i}`;
      values.push(filters.studentId);
      i++;
    }

    if (filters.practiceId) {
      query += ` AND practice_id = $${i}`;
      values.push(filters.practiceId);
      i++;
    }

    query += ' ORDER BY submitted_at DESC';

    const { rows } = await pool.query(query, values);
    return rows;
  },

  createEntrega: async (data) => {
  const isUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const practiceId = isUuid(data.practiceId) ? data.practiceId : null;
  const studentId  = isUuid(data.studentId) ? data.studentId : null;

  const { rows } = await pool.query(
    `INSERT INTO entregas
     (practice_id, student_id, student_name, type,
      file_url, quiz_answers, quiz_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      practiceId,
      studentId,
      data.studentName || '',
      data.type,
      data.fileUrl || null,
      data.quizAnswers ? JSON.stringify(data.quizAnswers) : null,
      data.quizScore ?? null,
    ]
  );

  return rows[0];
},

  calificarEntrega: async (id, { grade, feedback }) => {
    const { rows } = await pool.query(
      `UPDATE entregas
       SET grade = $1, feedback = $2, graded_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [grade, feedback || '', id]
    );
    return rows[0];
  },

  getMateriales: async () => {
    const { rows } = await pool.query(
      'SELECT * FROM materiales ORDER BY uploaded_at DESC'
    );
    return rows;
  },

  createMaterial: async (data) => {
    const { rows } = await pool.query(
      `INSERT INTO materiales
       (name, ext, size_bytes, category, practice_id, uploaded_by, file_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        data.name,
        data.ext,
        data.sizeBytes,
        data.category,
        data.practiceId || null,
        data.uploadedBy || '',
        data.fileUrl,
      ]
    );
    return rows[0];
  },

  deleteMaterial: async (id) => {
    await pool.query('DELETE FROM materiales WHERE id = $1', [id]);
  },

};

module.exports = DB;
