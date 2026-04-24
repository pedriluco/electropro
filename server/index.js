'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const practicasRouter  = require('./routes/practicas');
const alumnosRouter    = require('./routes/alumnos');
const entregasRouter   = require('./routes/entregas');
const materialesRouter = require('./routes/materiales');
const authRouter       = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth',       authRouter);
app.use('/api/practicas',  practicasRouter);
app.use('/api/alumnos',    alumnosRouter);
app.use('/api/entregas',   entregasRouter);
app.use('/api/materiales', materialesRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
