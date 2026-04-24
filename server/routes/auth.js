// ============================================================
// server/routes/auth.js — Autenticación
// ============================================================
// POST /api/auth/login  → devuelve usuario + token (simulado)
//
// CUANDO TENGAS TU BD:
//   1. Consulta el usuario por email en tu tabla de usuarios
//   2. Compara el password con bcrypt.compare()
//   3. Genera un JWT real con jsonwebtoken
//   4. El frontend guarda el token y lo manda en cada request
//      con: Authorization: Bearer <token>
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();

// ── Usuarios demo ─────────────────────────────────────────────
// BORRAR este bloque cuando tengas tu tabla de usuarios en BD.
const DEMO_USERS = [
  {
    id:       'tea-001',
    name:     'Prof. García',
    email:    'garcia@ipn.mx',
    password: '1234',           // en producción: hash bcrypt
    role:     'teacher',
    group:    'G2',
    initials: 'PG',
  },
  {
    id:       'stu-001',
    name:     'Juan Méndez',
    email:    'mendez@ipn.mx',
    password: '1234',
    role:     'student',
    group:    'G2',
    initials: 'JM',
  },
];
// ─────────────────────────────────────────────────────────────

// POST /api/auth/login
// Body: { email: string, password: string }
// Response: { user: {...}, token: string }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    // ── REEMPLAZAR con tu consulta a BD ──────────────────
    const user = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    // Con MySQL + bcrypt sería:
    //   const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    //   const user = rows[0];
    //   if (!user) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    //   const ok = await bcrypt.compare(password, user.password_hash);
    //   if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    // ─────────────────────────────────────────────────────

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // ── REEMPLAZAR con JWT real ──────────────────────────
    // const jwt = require('jsonwebtoken');
    // const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    const token = `demo-token-${user.id}-${Date.now()}`;
    // ─────────────────────────────────────────────────────

    // No devolver el password al cliente
    const { password: _pw, ...safeUser } = user;

    res.json({ user: safeUser, token });

  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — verifica el token y devuelve el usuario activo
// (útil para que el frontend recupere la sesión al recargar la página)
router.get('/me', async (req, res) => {
  // ── REEMPLAZAR con verificación JWT real ─────────────
  // const authHeader = req.headers.authorization;
  // if (!authHeader) return res.status(401).json({ error: 'Sin token.' });
  // const token = authHeader.split(' ')[1];
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // const user = await DB.getUserById(decoded.id);
  // return res.json(user);

  // Demo: devuelve un usuario fijo
  res.json(DEMO_USERS[0]);
  // ─────────────────────────────────────────────────────
});

module.exports = router;
