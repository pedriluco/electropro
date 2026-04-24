// ============================================================
// public/electro-lab-backend.js — Lógica del Frontend
// ============================================================
//
// Este archivo corre en el NAVEGADOR.
// Toda operación de datos llama al servidor Node con fetch().
// No hay arrays en memoria — la fuente de verdad es el servidor.
//
// ESTRUCTURA:
//   §1  CONFIG
//   §2  API CLIENT        — funciones fetch a la API de Node
//   §3  ROLES Y PERMISOS
//   §4  APP STATE         — solo el usuario activo (sin datos locales)
//   §5  PRÁCTICAS
//   §6  ALUMNOS
//   §7  ENTREGAS
//   §8  CALIFICACIONES
//   §9  MATERIALES
//   §10 VALIDACIÓN DE ARCHIVOS (en el cliente, antes de subir)
//   §11 CUESTIONARIOS
//   §12 RENDER DE LISTAS
//   §13 EDITOR (docente)
//   §14 NOTIFICACIONES
//   §15 UTILIDADES
//   §16 API PÚBLICA — window.ElectroLab
//
// ============================================================

'use strict';


// ============================================================
// §1  CONFIG
// ============================================================

const CONFIG = {
  // URL base de la API — si el frontend y el servidor corren
  // en el mismo origen (localhost:3000) puedes usar '/api'.
  // Si están separados, pon la URL completa del servidor.
  API_BASE: '/api',

  MAX_FILE_SIZE_MB:  50,
  MAX_PHOTO_SIZE_MB: 10,

  ALLOWED_MATERIAL_TYPES: {
    'application/pdf':          '.pdf',
    'video/mp4':                '.mp4',
    'video/quicktime':          '.mov',
    'image/jpeg':               '.jpg',
    'image/png':                '.png',
    'text/plain':               '.ino',
    'application/octet-stream': '.*',
  },

  ALLOWED_PHOTO_TYPES: {
    'image/jpeg': '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
  },

  ALLOWED_EXTENSIONS: [
    '.pdf', '.mp4', '.mov',
    '.jpg', '.jpeg', '.png', '.webp', '.heic',
    '.ino',
  ],
};


// ============================================================
// §2  API CLIENT — todas las llamadas al servidor Node
// ============================================================
//
// Estas funciones son el puente entre el navegador y el servidor.
// Si cambias el servidor (diferente URL, autenticación, etc.)
// solo modificas este bloque.
//
// getToken() devuelve el JWT guardado en localStorage.
// Cuando implementes login real, el token se guarda aquí
// al hacer POST /api/auth/login.
//
// ============================================================

function getToken() {
  return localStorage.getItem('electro_token') || '';
}

function saveToken(token) {
  localStorage.setItem('electro_token', token);
}

function clearToken() {
  localStorage.removeItem('electro_token');
}

/**
 * Wrapper de fetch que agrega Content-Type y Authorization.
 * Lanza un Error con el mensaje del servidor si la respuesta no es 2xx.
 *
 * @param {string} path   — ruta relativa a CONFIG.API_BASE, ej: '/practicas'
 * @param {object} opts   — opciones de fetch (method, body, etc.)
 */
async function apiFetch(path, opts = {}) {
  const url = CONFIG.API_BASE + path;

  const headers = {
    'Authorization': `Bearer ${getToken()}`,
    ...opts.headers,
  };

  // Solo agregar Content-Type si el body es JSON (no FormData)
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...opts, headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || `Error ${res.status}`);
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────

const API = {
  auth: {
    login: (email, password) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch('/auth/me'),
  },

  // ── Prácticas ──────────────────────────────────────────────
  practicas: {
    getAll: (role = 'student') =>
      apiFetch(`/practicas?role=${role}`),

    getById: (id) =>
      apiFetch(`/practicas/${id}`),

    create: (data) =>
      apiFetch('/practicas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, changes) =>
      apiFetch(`/practicas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),

    delete: (id) =>
      apiFetch(`/practicas/${id}`, { method: 'DELETE' }),

    publish: (id)   => apiFetch(`/practicas/${id}`, { method:'PATCH', body: JSON.stringify({ status:'published' }) }),
    unpublish: (id) => apiFetch(`/practicas/${id}`, { method:'PATCH', body: JSON.stringify({ status:'draft' }) }),
  },

  // ── Alumnos ────────────────────────────────────────────────
  alumnos: {
    getAll: () =>
      apiFetch('/alumnos'),

    getById: (id) =>
      apiFetch(`/alumnos/${id}`),

    create: (data) =>
      apiFetch('/alumnos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, changes) =>
      apiFetch(`/alumnos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),

    delete: (id) =>
      apiFetch(`/alumnos/${id}`, { method: 'DELETE' }),
  },

  // ── Entregas ───────────────────────────────────────────────
  entregas: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return apiFetch(`/entregas?${params}`);
    },

    create: (data) =>
      apiFetch('/entregas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    calificar: (id, grade, feedback) =>
      apiFetch(`/entregas/${id}/calificar`, {
        method: 'PATCH',
        body: JSON.stringify({ grade, feedback }),
      }),
  },

  // ── Materiales ─────────────────────────────────────────────
  materiales: {
    getAll: () =>
      apiFetch('/materiales'),

    // Sube el archivo con FormData (multipart), no base64
    create: (file, { name, category, practiceId, uploadedBy }) => {
      const form = new FormData();
      form.append('file',       file);
      form.append('name',       name       || file.name);
      form.append('category',   category   || 'pdf');
      form.append('practiceId', practiceId || '');
      form.append('uploadedBy', uploadedBy || '');
      return apiFetch('/materiales', { method: 'POST', body: form });
    },

    delete: (id) =>
      apiFetch(`/materiales/${id}`, { method: 'DELETE' }),
  },
};


// ============================================================
// §3  ROLES Y PERMISOS
// ============================================================

const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
};

const PERMISSIONS = {
  [ROLES.STUDENT]: {
    canViewPractices:   true,
    canSubmitWork:      true,
    canUploadMaterial:  false,
    canCreatePractice:  false,
    canGrade:           false,
    canViewAllStudents: false,
    canDeletePractice:  false,
    canPublishPractice: false,
    canEnrollStudents:  false,
    canDeleteStudent:   false,
  },
  [ROLES.TEACHER]: {
    canViewPractices:   true,
    canSubmitWork:      false,
    canUploadMaterial:  true,
    canCreatePractice:  true,
    canGrade:           true,
    canViewAllStudents: true,
    canDeletePractice:  true,
    canPublishPractice: true,
    canEnrollStudents:  true,
    canDeleteStudent:   true,
  },
};

function can(action) {
  const role = AppState.currentUser?.role;
  if (!role) return false;
  return PERMISSIONS[role]?.[action] ?? false;
}

function requirePermission(action) {
  if (!can(action)) {
    notify('No tienes permiso para realizar esta acción.', 'error');
    throw new Error(`Permiso denegado: ${action}`);
  }
}


// ============================================================
// §4  APP STATE
// ============================================================
//
// AppState ya no guarda arrays de datos en memoria.
// Solo guarda el usuario activo y un caché ligero para
// no hacer fetch en cada render menor.
// Los datos reales viven en el servidor.
//
// ─────────────────────────────────────────────────────────────

const AppState = {
  currentUser: null,

  // Caché ligero — se invalida al crear/modificar/borrar datos
  _cache: {
    practicas:  null,
    alumnos:    null,
    entregas:   null,
    materiales: null,
  },

  // Invalida el caché de una colección para forzar re-fetch
  invalidate(collection) {
    if (collection) this._cache[collection] = null;
    else Object.keys(this._cache).forEach(k => this._cache[k] = null);
  },

  setUser(user) {
    this.currentUser = user;
    const avEl = document.getElementById('av-initials');
    const rlEl = document.getElementById('role-label');
    if (avEl) avEl.textContent = user?.initials || user?.name?.[0] || '?';
    if (rlEl) rlEl.textContent = user?.name     || '—';
  },

  // ── Getters con caché ───────────────────────────────────

  async getPracticas() {
    if (!this._cache.practicas) {
      const role = this.currentUser?.role || 'student';
      this._cache.practicas = await API.practicas.getAll(role);
    }
    return this._cache.practicas;
  },

  async getPublishedPracticas() {
    const all = await this.getPracticas();
    return all.filter(p => p.status === 'published');
  },

  async getAlumnos() {
    if (!this._cache.alumnos) {
      this._cache.alumnos = await API.alumnos.getAll();
    }
    return this._cache.alumnos;
  },

  async getEntregas(filters = {}) {
    // Las entregas no se cachean porque cambian frecuentemente
    return API.entregas.getAll(filters);
  },

  async getStudentSubmissions(studentId) {
    return this.getEntregas({ studentId });
  },

  async getPendingGrading() {
    const all = await this.getEntregas();
    return all.filter(e => e.grade === null);
  },

  async getMateriales() {
    if (!this._cache.materiales) {
      this._cache.materiales = await API.materiales.getAll();
    }
    return this._cache.materiales;
  },
};


// ============================================================
// §5  PRÁCTICAS
// ============================================================

async function addPractice(data) {
  requirePermission('canCreatePractice');
  if (!data.title?.trim()) {
    notify('El título de la práctica es obligatorio.', 'error');
    throw new Error('Título vacío');
  }
  const saved = await API.practicas.create({
    ...data,
    createdBy: AppState.currentUser?.id,
  });
  AppState.invalidate('practicas');
  notify(`"${saved.title}" guardada como borrador.`, 'success');
  return saved;
}

async function publishPractice(id) {
  requirePermission('canPublishPractice');
  const updated = await API.practicas.publish(id);
  AppState.invalidate('practicas');
  notify(`"${updated.title}" publicada.`, 'success');
  return updated;
}

async function unpublishPractice(id) {
  requirePermission('canPublishPractice');
  const updated = await API.practicas.unpublish(id);
  AppState.invalidate('practicas');
  notify(`"${updated.title}" regresada a borrador.`, 'info');
  return updated;
}

async function deletePractice(id) {
  requirePermission('canDeletePractice');
  const pracs = await AppState.getPracticas();
  const p = pracs.find(x => x.id === id);
  if (p?.status === 'published') {
    const ok = confirm(`¿Eliminar la práctica publicada "${p.title}"?\nEsta acción no se puede deshacer.`);
    if (!ok) return;
  }
  await API.practicas.delete(id);
  AppState.invalidate('practicas');
  notify('Práctica eliminada.', 'info');
}


// ============================================================
// §6  ALUMNOS
// ============================================================

async function enrollStudent(data) {
  requirePermission('canEnrollStudents');
  if (!data.name?.trim())      { notify('El nombre es obligatorio.', 'error'); throw new Error('Nombre vacío'); }
  if (!data.matricula?.trim()) { notify('La matrícula es obligatoria.', 'error'); throw new Error('Matrícula vacía'); }

  const saved = await API.alumnos.create(data);  // el servidor valida duplicados
  AppState.invalidate('alumnos');
  notify(`Alumno "${saved.name}" inscrito.`, 'success');
  return saved;
}

async function removeStudent(id) {
  requirePermission('canDeleteStudent');
  const alumnos = await AppState.getAlumnos();
  const s = alumnos.find(x => x.id === id);
  if (!s) return notify('Alumno no encontrado.', 'error');
  const ok = confirm(`¿Dar de baja a "${s.name}" (${s.matricula})?\nSus entregas se conservarán.`);
  if (!ok) return;
  await API.alumnos.delete(id);
  AppState.invalidate('alumnos');
  notify(`"${s.name}" dado de baja.`, 'info');
}

async function updateStudent(id, changes) {
  requirePermission('canEnrollStudents');
  const updated = await API.alumnos.update(id, changes);
  AppState.invalidate('alumnos');
  notify(`Datos actualizados.`, 'success');
  return updated;
}

async function submitEnrollForm() {
  requirePermission('canEnrollStudents');
  const data = {
    name:      document.getElementById('enroll-name')?.value?.trim(),
    matricula: document.getElementById('enroll-matricula')?.value?.trim(),
    email:     document.getElementById('enroll-email')?.value?.trim(),
    group:     document.getElementById('enroll-group')?.value?.trim() || 'G1',
  };
  try {
    await enrollStudent(data);
    ['enroll-name','enroll-matricula','enroll-email'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    await renderStudentList();
    renderStudentCount();
  } catch (err) {
    // El mensaje ya fue notificado dentro de enrollStudent o apiFetch
    console.warn('[ElectroLab] Enroll error:', err.message);
  }
}


// ============================================================
// §7  ENTREGAS
// ============================================================

async function submitWork(data) {
  requirePermission('canSubmitWork');

  const pracs = await AppState.getPracticas();
  const practice = pracs.find(p => p.id === data.practiceId);
  if (!practice) { notify('Práctica no encontrada.', 'error'); return; }

  let quizScore = null;
  if (data.type === 'quiz' && data.quizAnswers && practice.quiz) {
    quizScore = gradeQuiz(practice.quiz, data.quizAnswers);
  }

  const entrega = await API.entregas.create({
    practiceId:  data.practiceId,
    studentId:   AppState.currentUser.id,
    studentName: AppState.currentUser.name,
    type:        data.type,
    fileUrl:     data.fileUrl     ?? null,
    quizAnswers: data.quizAnswers ?? null,
    quizScore,
  });

  const msg = data.type === 'quiz'
    ? `Cuestionario enviado — puntaje: ${quizScore}/${practice.quiz?.length ?? '?'}`
    : 'Foto entregada. El docente la revisará pronto.';
  notify(msg, 'success');
  return entrega;
}


// ============================================================
// §8  CALIFICACIONES
// ============================================================

async function gradeSubmissionAction(submissionId, grade, feedback) {
  requirePermission('canGrade');
  if (isNaN(grade) || grade < 0 || grade > 10) {
    notify('La calificación debe ser entre 0 y 10.', 'error');
    return;
  }
  const saved = await API.entregas.calificar(submissionId, Number(grade), feedback || '');
  notify(`Calificación ${grade}/10 guardada.`, 'success');
  return saved;
}

async function submitGradeFromForum() {
  requirePermission('canGrade');
  const submissionId = document.getElementById('foro-submission-id')?.value?.trim();
  const grade        = parseFloat(document.getElementById('foro-grade')?.value);
  const feedback     = document.getElementById('foro-feedback')?.value?.trim();

  if (!submissionId) { notify('Selecciona una entrega de la lista.', 'warn'); return; }
  if (isNaN(grade))  { notify('Escribe una calificación numérica.', 'warn'); return; }

  await gradeSubmissionAction(submissionId, grade, feedback);
  await renderPendingSubmissions();

  ['foro-submission-id','foro-grade','foro-feedback'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}

function selectSubmission(submissionId) {
  const idField = document.getElementById('foro-submission-id');
  if (idField) idField.value = submissionId;
  notify('Entrega seleccionada. Escribe la calificación y envía.', 'info');
}


// ============================================================
// §9  MATERIALES
// ============================================================

// Archivo pendiente de subir (seleccionado pero aún no enviado)
let _pendingMaterialFile = null;

async function addMaterial(file, meta) {
  requirePermission('canUploadMaterial');
  const saved = await API.materiales.create(file, {
    ...meta,
    uploadedBy: AppState.currentUser?.id,
  });
  AppState.invalidate('materiales');
  notify(`"${saved.name}" subido.`, 'success');
  return saved;
}

async function deleteMaterial(id) {
  requirePermission('canUploadMaterial');
  await API.materiales.delete(id);
  AppState.invalidate('materiales');
  notify('Material eliminado.', 'info');
}


// ============================================================
// §10  VALIDACIÓN DE ARCHIVOS (en el cliente)
// ============================================================
//
// Esta validación ocurre ANTES de subir el archivo al servidor.
// Es una primera línea de defensa en el navegador.
// El servidor también valida (multer) — ambas capas son necesarias.
//
// ─────────────────────────────────────────────────────────────

/**
 * Valida un File del input (tipo, extensión, tamaño).
 * NO lo convierte a base64 — solo lo valida.
 * El archivo se sube con FormData directamente.
 *
 * @param {File} file
 * @param {'material'|'photo'} context
 * @returns {boolean}  true si es válido
 */
function validateFile(file, context = 'material') {
  const nameLower = file.name.toLowerCase();
  const ext       = '.' + nameLower.split('.').pop();

  if (!CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
    notify(`Extensión "${ext}" no permitida.`, 'error');
    return false;
  }

  const allowedMimes = context === 'photo' ? CONFIG.ALLOWED_PHOTO_TYPES : CONFIG.ALLOWED_MATERIAL_TYPES;
  if (ext !== '.ino' && file.type && !allowedMimes[file.type]) {
    notify(`Tipo de archivo no permitido en este campo.`, 'error');
    return false;
  }

  const limitMB    = context === 'photo' ? CONFIG.MAX_PHOTO_SIZE_MB : CONFIG.MAX_FILE_SIZE_MB;
  const limitBytes = limitMB * 1024 * 1024;
  if (file.size > limitBytes) {
    notify(`El archivo pesa ${(file.size/1024/1024).toFixed(1)} MB. Máximo: ${limitMB} MB.`, 'error');
    return false;
  }
  if (file.size === 0) {
    notify('El archivo está vacío.', 'error');
    return false;
  }

  return true;
}

async function handlePhotoUpload(event, practiceId) {
  const file = event.target.files?.[0];
  if (!file) return;
  const dz = event.target.closest('.drop');

  if (!validateFile(file, 'photo')) {
    if (dz) setDropZoneError(dz);
    return;
  }

  if (dz) setDropZoneLoading(dz, file.name);

  try {
    // 1. Subir el archivo al servidor y obtener la URL
    const saved = await API.materiales.create(file, {
      name:       file.name,
      category:   'image',
      practiceId: null,
      uploadedBy: AppState.currentUser?.id,
    });

    if (dz) setDropZoneSuccess(dz, file.name, file.size);

    // 2. Registrar la entrega con la URL del archivo
    await submitWork({ practiceId, type: 'photo', fileUrl: saved.fileUrl });

    // 3. Marcar tarjeta como entregada
    setTimeout(() => {
      const card = document.getElementById(`task-card-${practiceId}`);
      if (card) {
        card.style.opacity       = '0.5';
        card.style.pointerEvents = 'none';
        card.insertAdjacentHTML('afterbegin',
          '<div class="tag tg" style="display:inline-flex;margin-bottom:10px">✓ Entregado — esperando calificación</div>');
      }
    }, 600);

  } catch (err) {
    if (dz) setDropZoneError(dz);
    notify(err.message || 'Error al subir la foto.', 'error');
  }
}

async function handleMaterialUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!validateFile(file, 'material')) return;
  _pendingMaterialFile = file;
  const dz = event.target.closest('.drop');
  if (dz) setDropZoneSuccess(dz, file.name, file.size);
}

async function saveMaterial() {
  if (!_pendingMaterialFile) {
    notify('Primero selecciona un archivo.', 'error');
    return;
  }
  const name       = document.getElementById('mat-title')?.value?.trim() || _pendingMaterialFile.name;
  const category   = document.getElementById('mat-category')?.value || 'pdf';
  const practiceId = document.getElementById('mat-practice')?.value || null;

  try {
    await addMaterial(_pendingMaterialFile, { name, category, practiceId });
    _pendingMaterialFile = null;
    if (document.getElementById('mat-title')) document.getElementById('mat-title').value = '';
    resetDropZoneById('mat-drop');
    await renderMaterialList();
    await renderLabMaterials();
  } catch (err) {
    notify(err.message || 'Error al subir el material.', 'error');
  }
}

async function handleEditorFiles(event) {
  for (const file of [...(event.target.files || [])]) {
    if (!validateFile(file, 'material')) continue;
    _editorFiles.push(file);   // guardamos el File object, no el base64
    renderEditorFileList();
  }
}

// Helpers visuales del drop zone
function setDropZoneLoading(el, name) {
  el.innerHTML = `<div style="font-size:24px;margin-bottom:8px">⏳</div><div style="font-family:var(--mono);font-size:12px;color:var(--td)">Subiendo ${name}…</div>`;
}
function setDropZoneSuccess(el, name, sizeBytes) {
  const mb = (sizeBytes / 1024 / 1024).toFixed(2);
  el.innerHTML = `<div style="font-size:24px;margin-bottom:8px">✅</div><div style="font-family:var(--mono);font-size:12px;color:var(--a3)">${name}</div><div style="font-size:11px;color:var(--tf);margin-top:4px">${mb} MB</div>`;
}
function setDropZoneError(el) {
  el.innerHTML = `<div style="font-size:24px;margin-bottom:8px">❌</div><div style="font-family:var(--mono);font-size:12px;color:var(--ar)">Archivo no válido o error al subir</div>`;
  setTimeout(() => resetDropZoneEl(el), 3000);
}
function resetDropZoneEl(el) {
  const ctx  = el.dataset.context || 'material';
  const lim  = ctx === 'photo' ? CONFIG.MAX_PHOTO_SIZE_MB : CONFIG.MAX_FILE_SIZE_MB;
  const exts = ctx === 'photo' ? 'JPG · PNG · WEBP · HEIC' : 'PDF · .ino · Imágenes · Video';
  el.innerHTML = `<input type="file" style="display:none"><div style="font-size:28px;margin-bottom:8px">📁</div><div style="font-family:var(--mono);font-size:12px;color:var(--td)">Arrastra o haz clic</div><div style="font-size:11px;color:var(--tf);margin-top:4px">${exts} · máx. ${lim} MB</div>`;
}
function resetDropZoneById(id) {
  const el = document.getElementById(id);
  if (el) resetDropZoneEl(el);
}


// ============================================================
// §11  CUESTIONARIOS
// ============================================================

function gradeQuiz(questions, answers) {
  return questions.reduce((sc, q, i) => sc + (answers[i] === q.ans ? 1 : 0), 0);
}

function buildQuizHTML(questions, practiceId) {
  if (!questions?.length) return '<p style="color:var(--td);font-size:13px">Sin cuestionario asignado.</p>';
  return `
    <div class="qwrap" id="quiz-${practiceId}">
      ${questions.map((q, i) => `
        <div class="qitem" id="qi-${practiceId}-${i}">
          <div class="qtext">${i + 1}. ${q.q}</div>
          <div class="qopts">
            ${q.opts.map((o, j) => `
              <label class="qopt" id="qopt-${practiceId}-${i}-${j}"
                     onclick="selectQuizOpt('${practiceId}',${i},${j})">
                <input type="radio" name="quiz-${practiceId}-q${i}" value="${j}"> ${o}
              </label>`).join('')}
          </div>
          <div id="qfb-${practiceId}-${i}"></div>
        </div>`).join('')}
    </div>
    <div style="margin-top:14px;display:flex;gap:10px">
      <button class="btn bp" onclick="submitQuizFromModal('${practiceId}')">Enviar cuestionario</button>
      <button class="btn bg" onclick="resetQuizInModal('${practiceId}')">Reiniciar</button>
    </div>`;
}

function selectQuizOpt(practiceId, qi, oi) {
  document.querySelectorAll(`#qi-${practiceId}-${qi} .qopt`).forEach(o => o.classList.remove('sel'));
  document.getElementById(`qopt-${practiceId}-${qi}-${oi}`)?.classList.add('sel');
}

async function submitQuizFromModal(practiceId) {
  const pracs    = await AppState.getPracticas();
  const practice = pracs.find(p => p.id === practiceId);
  if (!practice?.quiz) return;

  const answers = practice.quiz.map((_, i) => {
    const sel = document.querySelector(`[name="quiz-${practiceId}-q${i}"]:checked`);
    return sel ? parseInt(sel.value) : null;
  });

  const missing = answers.filter(a => a === null).length;
  if (missing) { notify(`Faltan ${missing} pregunta(s) por responder.`, 'error'); return; }

  let score = 0;
  practice.quiz.forEach((q, i) => {
    const ok = answers[i] === q.ans;
    if (ok) score++;
    const fb = document.getElementById(`qfb-${practiceId}-${i}`);
    if (fb) { fb.className = 'qfb ' + (ok ? 'ok' : 'bad'); fb.textContent = ok ? `✓ ${q.fb}` : `✗ Correcta: ${q.opts[q.ans]}`; }
    document.getElementById(`qopt-${practiceId}-${i}-${answers[i]}`)?.classList.add(ok ? 'cor' : 'err');
    if (!ok) document.getElementById(`qopt-${practiceId}-${i}-${q.ans}`)?.classList.add('cor');
  });

  await submitWork({ practiceId, type: 'quiz', quizAnswers: answers });
}

function resetQuizInModal(practiceId) {
  document.querySelectorAll(`#quiz-${practiceId} .qopt`).forEach(o => o.classList.remove('sel','cor','err'));
  document.querySelectorAll(`#quiz-${practiceId} .qfb`).forEach(f => { f.className=''; f.textContent=''; });
  document.querySelectorAll(`#quiz-${practiceId} input[type=radio]`).forEach(r => r.checked=false);
}


// ============================================================
// §12  RENDER DE LISTAS
// ============================================================

async function renderStudentPractices() {
  const el = document.getElementById('prac-list');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="eico">⏳</div><div class="etxt">Cargando prácticas…</div></div>';
  try {
    const pub = await AppState.getPublishedPracticas();
    el.innerHTML = pub.length === 0
      ? '<div class="empty"><div class="eico">📭</div><div class="etxt">Aún no hay prácticas publicadas.</div><div class="esub">Tu maestro las irá subiendo.</div></div>'
      : (await Promise.all(pub.map(p => buildPracticeCardHTML(p)))).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error cargando prácticas: ${err.message}</div></div>`;
  }
}

async function buildPracticeCardHTML(p) {
  const myId = AppState.currentUser?.id || '';
  const subs = myId ? await AppState.getStudentSubmissions(myId) : [];
  const done = subs.some(s => s.practiceId === p.id);
  const stars = '⭐'.repeat(p.difficulty || 1) + '☆'.repeat(3 - (p.difficulty || 1));
  return `
    <div class="pcard" onclick="openPrac('${p.id}')">
      <div class="pch"><span class="pnum">${p.num}</span><div class="pt">${p.title}</div></div>
      <div class="pb2">${(p.objective||'').substring(0,100)}${(p.objective||'').length>100?'…':''}</div>
      <div class="pf">
        <span style="color:var(--aw);font-size:12px">${stars}</span>
        ${done ? '<span class="tag tg">✓ Entregada</span>' : '<span class="tag tw">Pendiente</span>'}
      </div>
    </div>`;
}

async function renderTeacherPractices() {
  const el = document.getElementById('t-prac-list');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="eico">⏳</div><div class="etxt">Cargando…</div></div>';
  try {
    const pracs = await AppState.getPracticas();
    if (!pracs.length) {
      el.innerHTML = '<div class="empty"><div class="eico">📝</div><div class="etxt">Aún no has creado prácticas.</div></div>';
      return;
    }
    el.innerHTML = pracs.map(p => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <span class="tag tc">${p.num}</span>
          <span class="tag ${p.status==='published'?'tg':'tw'}">${p.status==='published'?'🟢 Publicada':'📄 Borrador'}</span>
        </div>
        <div class="card-t">${p.title||'Sin título'}</div>
        <div style="color:var(--td);font-size:12px;margin:6px 0 10px">${(p.objective||'').substring(0,80)}${(p.objective||'').length>80?'…':''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn bo btn-sm" onclick="openPrac('${p.id}')">Vista previa</button>
          ${p.status==='draft'
            ? `<button class="btn bs btn-sm" onclick="publishPractice('${p.id}').then(renderTeacherPractices)">Publicar</button>`
            : `<button class="btn bg btn-sm" onclick="unpublishPractice('${p.id}').then(renderTeacherPractices)">Regresar a borrador</button>`}
          <button class="btn bg btn-sm" onclick="deletePractice('${p.id}').then(renderTeacherPractices)">🗑 Eliminar</button>
        </div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error: ${err.message}</div></div>`;
  }
}

async function renderStudentTasks() {
  const el = document.getElementById('task-list');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="eico">⏳</div><div class="etxt">Cargando tareas…</div></div>';
  try {
    const pub        = await AppState.getPublishedPracticas();
    const myId       = AppState.currentUser?.id || '';
    const mySubs     = myId ? await AppState.getStudentSubmissions(myId) : [];
    const submittedP = new Set(mySubs.map(s => `${s.practiceId}:${s.type}`));
    const pending    = pub.filter(p => {
      if (p.deliveryType === 'both') return !submittedP.has(`${p.id}:photo`) || !submittedP.has(`${p.id}:quiz`);
      return !submittedP.has(`${p.id}:${p.deliveryType}`);
    });

    if (!pending.length) {
      el.innerHTML = '<div class="empty"><div class="eico">🎉</div><div class="etxt">¡No hay tareas pendientes!</div></div>';
      return;
    }

    el.innerHTML = pending.map(p => `
      <div class="card" id="task-card-${p.id}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="tag tc">${p.num}</span>
              <span class="tag ${p.deliveryType==='photo'?'tc':p.deliveryType==='quiz'?'tb':'tg'}">
                ${p.deliveryType==='photo'?'📷 Foto':p.deliveryType==='quiz'?'📝 Quiz':'📋 Ambos'}
              </span>
            </div>
            <div style="font-family:var(--head);font-weight:600;font-size:.95rem">${p.title}</div>
          </div>
          <button class="btn bg btn-sm" onclick="openPrac('${p.id}')">Ver práctica</button>
        </div>
        ${p.deliveryType==='quiz'||p.deliveryType==='both' ? `
          <div style="margin-top:10px;border-top:1px solid var(--b);padding-top:14px">
            <div style="font-family:var(--mono);font-size:10px;color:var(--tf);margin-bottom:10px;letter-spacing:.08em">CUESTIONARIO</div>
            ${buildQuizHTML(p.quiz, p.id)}
          </div>` : ''}
        ${p.deliveryType==='photo'||p.deliveryType==='both' ? `
          <div style="margin-top:10px;border-top:1px solid var(--b);padding-top:14px">
            <div style="font-family:var(--mono);font-size:10px;color:var(--tf);margin-bottom:10px;letter-spacing:.08em">ENTREGA DE FOTO</div>
            <div class="drop" data-context="photo" data-practice="${p.id}" onclick="this.querySelector('input').click()">
              <input type="file" accept="image/jpeg,image/png,image/webp,.heic"
                     onchange="handlePhotoUpload(event,'${p.id}')">
              <div style="font-size:24px;margin-bottom:6px">📷</div>
              <div style="font-family:var(--mono);font-size:12px;color:var(--td)">Sube foto del circuito armado</div>
              <div style="font-size:11px;color:var(--tf);margin-top:4px">JPG · PNG · WEBP · máx. 10 MB</div>
            </div>
          </div>` : ''}
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error: ${err.message}</div></div>`;
  }
}

async function renderPendingSubmissions() {
  const el = document.getElementById('foro-entregas');
  if (!el) return;
  try {
    const pending = await AppState.getPendingGrading();
    const pracs   = await AppState.getPracticas();
    if (!pending.length) {
      el.innerHTML = '<div class="empty"><div class="eico">✅</div><div class="etxt">Todas las entregas están calificadas.</div></div>';
      return;
    }
    el.innerHTML = pending.map(s => {
      const p    = pracs.find(x => x.id === s.practiceId);
      const date = new Date(s.submittedAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return `
        <div class="fpost" onclick="selectSubmission('${s.id}')">
          <div class="fau">
            <div class="fav stu">${(s.studentName||'?')[0]}</div>
            <div><div class="fname">${s.studentName}</div><div class="ftime">${p?.num||''} ${p?.title||''} · ${date}</div></div>
            <span class="tag tw" style="margin-left:auto">Pendiente</span>
          </div>
          <div style="font-size:12px;color:var(--td)">
            ${s.type==='photo' ? `📷 <a href="${s.fileUrl}" target="_blank" style="color:var(--a2)">Ver foto</a>` : `📝 Quiz: ${s.quizScore}/${p?.quiz?.length??'?'}`}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error: ${err.message}</div></div>`;
  }
}

async function renderStudentList() {
  const el = document.getElementById('student-table');
  if (!el) return;
  try {
    const alumnos = await AppState.getAlumnos();
    const pracs   = await AppState.getPublishedPracticas();

    if (!alumnos.length) {
      el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--td);font-family:var(--mono);font-size:12px">Sin alumnos inscritos todavía.</td></tr>`;
      return;
    }

    const rows = await Promise.all(alumnos.map(async s => {
      const subs   = await AppState.getStudentSubmissions(s.id);
      const graded = subs.filter(x => x.grade != null);
      const avg    = graded.length ? (graded.reduce((a,b) => a+b.grade,0)/graded.length).toFixed(1) : '—';
      const status = !pracs.length   ? 'Sin prácticas'
                   : subs.length >= pracs.length ? 'Al corriente'
                   : subs.length > 0             ? 'Pendiente'
                   : 'Sin entregas';
      return `
        <tr style="border-bottom:1px solid var(--b)">
          <td style="padding:10px 8px">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="av" style="width:26px;height:26px;font-size:10px">${(s.name||'?').split(' ').map(x=>x[0]).join('')}</div>
              <div><div style="font-size:13px">${s.name}</div><div style="font-size:11px;color:var(--tf);font-family:var(--mono)">${s.matricula||''}</div></div>
            </div>
          </td>
          <td style="padding:10px 8px;font-size:12px;color:var(--td)">${s.group||'—'}</td>
          <td style="padding:10px 8px;font-size:12px;color:var(--td)">${s.email||'—'}</td>
          <td style="padding:10px 8px;font-family:var(--mono);font-size:12px">${subs.length}/${pracs.length}</td>
          <td style="padding:10px 8px;font-family:var(--mono);font-size:12px;color:var(--a3)">${avg}</td>
          <td style="padding:10px 8px">
            <span class="tag ${status==='Al corriente'?'tg':status==='Pendiente'?'tw':'tr'}" style="margin-bottom:4px">${status}</span><br>
            <button class="btn bg btn-sm" style="margin-top:4px"
              onclick="removeStudent('${s.id}').then(()=>{renderStudentList();renderStudentCount()})">Dar de baja</button>
          </td>
        </tr>`;
    }));

    el.innerHTML = rows.join('');
  } catch (err) {
    el.innerHTML = `<tr><td colspan="6" style="padding:20px;color:var(--ar)">Error: ${err.message}</td></tr>`;
  }
}

async function renderStudentCount() {
  const el = document.getElementById('t-student-count');
  if (!el) return;
  try {
    const alumnos = await AppState.getAlumnos();
    el.textContent = alumnos.length;
  } catch (_) { el.textContent = '?'; }
}

async function renderLabMaterials() {
  const el = document.getElementById('lab-materials');
  if (!el) return;
  try {
    const mats  = await AppState.getMateriales();
    const icons = { pdf:'📄', video:'🎥', code:'💾', image:'🖼️', other:'📁' };
    el.innerHTML = mats.length === 0
      ? '<div class="empty"><div class="eico">📂</div><div class="etxt">El docente aún no ha subido materiales.</div></div>'
      : mats.map(m => `
          <div class="card" style="display:flex;align-items:center;gap:14px;cursor:pointer"
               onclick="window.open('${m.fileUrl}','_blank')">
            <div style="font-size:32px;flex-shrink:0">${icons[m.category]||'📁'}</div>
            <div style="flex:1">
              <div class="card-t">${m.name}</div>
              <div style="color:var(--td);font-size:12px;margin-top:3px">${formatDate(m.uploadedAt)}</div>
            </div>
            <span class="tag tb">${m.ext?.toUpperCase()}</span>
          </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error: ${err.message}</div></div>`;
  }
}

async function renderMaterialList() {
  const el = document.getElementById('mat-list');
  if (!el) return;
  try {
    const mats  = await AppState.getMateriales();
    const icons = { pdf:'📄', video:'🎥', code:'💾', image:'🖼️', other:'📁' };
    el.innerHTML = mats.length === 0
      ? '<div class="empty"><div class="eico">📂</div><div class="etxt">Sin materiales todavía.</div></div>'
      : mats.map(m => `
          <div style="display:flex;align-items:center;gap:10px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--b)">
            <span style="font-size:18px">${icons[m.category]||'📁'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</span>
            <span class="tag tb">${m.ext?.toUpperCase()}</span>
            <button class="btn bg btn-sm" onclick="deleteMaterial('${m.id}').then(()=>{renderMaterialList();renderLabMaterials()})">✕</button>
          </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="eico">⚠️</div><div class="etxt">Error: ${err.message}</div></div>`;
  }
}


// ============================================================
// §13  EDITOR (docente)
// ============================================================

let _stepCount     = 1;
const _editorFiles = [];   // File objects — se suben con FormData al guardar

async function saveFromEditor(publish = false) {
  requirePermission('canCreatePractice');
  const get = id => document.getElementById(id)?.value?.trim() || '';

  const data = {
    num:            get('ed-num'),
    title:          get('ed-title'),
    objective:      get('ed-objective'),
    difficulty:     parseInt(document.getElementById('ed-difficulty')?.value) || 1,
    deliveryType:   document.getElementById('ed-delivery')?.value || 'photo',
    components:     Array.from(document.querySelectorAll('#ed-comp-list .chi input:checked + span')).map(e => e.textContent.trim()),
    steps:          Array.from(document.querySelectorAll('#ed-steps textarea')).map(t => t.value.trim()).filter(Boolean),
    circuitDiagram: get('ed-circuit'),
    codeSnippet:    get('ed-code'),
    quiz:           null,
  };

  const practice = await addPractice(data);

  // Subir archivos adjuntos si hay
  for (const file of _editorFiles) {
    await API.materiales.create(file, {
      name:       file.name,
      category:   'other',
      practiceId: practice.id,
      uploadedBy: AppState.currentUser?.id,
    });
  }

  if (publish) await publishPractice(practice.id);
  await renderTeacherPractices();
  clearEditor();
  return practice;
}

function clearEditor() {
  ['ed-num','ed-title','ed-objective','ed-circuit','ed-code'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('#ed-comp-list .chi input').forEach(cb => cb.checked = false);
  document.querySelectorAll('#ed-steps textarea').forEach(ta => ta.value = '');
  _editorFiles.length = 0;
  const efl = document.getElementById('editor-file-list');
  if (efl) efl.innerHTML = '';
  _stepCount = 1;
}

function addStep() {
  _stepCount++;
  const row = document.createElement('div');
  row.className = 'step-row';
  row.style.cssText = 'display:flex;gap:8px;align-items:flex-start';
  row.innerHTML = `
    <span class="tag tc" style="flex-shrink:0;margin-top:8px">${String(_stepCount).padStart(2,'0')}</span>
    <textarea placeholder="Paso ${_stepCount}…" style="flex:1;min-height:56px"></textarea>
    <button class="btn bg btn-sm" style="margin-top:8px" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('ed-steps').appendChild(row);
}

function addCustomComponent() {
  const name = prompt('Nombre del componente:');
  if (!name?.trim()) return;
  const row = document.createElement('div');
  row.className = 'chi';
  row.innerHTML = `<input type="checkbox" checked><span>${name.trim()}</span>`;
  document.getElementById('ed-comp-list').appendChild(row);
}

function renderEditorFileList() {
  const el = document.getElementById('editor-file-list');
  if (!el) return;
  el.innerHTML = _editorFiles.map((f, i) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px solid var(--b)">
      <span>📎</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${f.name}</span>
      <span style="font-family:var(--mono);color:var(--tf)">${formatBytes(f.size)}</span>
      <button class="btn bg btn-sm" onclick="_editorFiles.splice(${i},1);renderEditorFileList()">✕</button>
    </div>`).join('');
}

async function populateForumSelects() {
  try {
    const alumnos = await AppState.getAlumnos();
    const pracs   = await AppState.getPublishedPracticas();
    const stuSel  = document.getElementById('foro-student');
    const pracSel = document.getElementById('foro-practice');
    if (stuSel)  stuSel.innerHTML  = alumnos.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (pracSel) pracSel.innerHTML = '<option value="">— Selecciona —</option>' +
      pracs.map(p => `<option value="${p.id}">${p.num} — ${p.title}</option>`).join('');
  } catch (_) {}
}

async function populateMaterialSelects() {
  try {
    const pracs = await AppState.getPublishedPracticas();
    const sel   = document.getElementById('mat-practice');
    if (!sel) return;
    sel.innerHTML = '<option value="">— General —</option>' +
      pracs.map(p => `<option value="${p.id}">${p.num} — ${p.title}</option>`).join('');
  } catch (_) {}
}


// ============================================================
// §14  NOTIFICACIONES
// ============================================================

function notify(message, type = 'info', duration = 4000) {
  const colors = { success:'var(--a3)', error:'var(--ar)', info:'var(--ag)', warn:'var(--aw)' };
  const icons  = { success:'✓', error:'✕', info:'ℹ', warn:'⚠' };
  const toast  = document.createElement('div');
  toast.className = 'electro-toast';
  const offset = document.querySelectorAll('.electro-toast').length * 64;
  toast.style.cssText = `position:fixed;bottom:${24+offset}px;right:24px;z-index:9999;max-width:340px;padding:12px 16px;background:var(--bg3);border-radius:8px;border-left:3px solid ${colors[type]};box-shadow:0 4px 20px rgba(0,0,0,.4);font-family:var(--body);font-size:13px;color:var(--t);display:flex;align-items:flex-start;gap:10px;animation:slideIn .2s ease;transition:opacity .3s,transform .3s;`;
  toast.innerHTML = `<span style="color:${colors[type]};font-size:14px;flex-shrink:0">${icons[type]}</span><span>${message}</span>`;
  if (!document.getElementById('toast-styles')) {
    const s = document.createElement('style');
    s.id='toast-styles';
    s.textContent='@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  if (duration > 0) {
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(20px)'; setTimeout(()=>toast.remove(),300); }, duration);
  }
}


// ============================================================
// §15  UTILIDADES
// ============================================================

function formatBytes(b) {
  if (b<1024)    return `${b} B`;
  if (b<1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function generateId(prefix='id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
}


// ============================================================
// §16  API PÚBLICA
// ============================================================

window.ElectroLab = {
  AppState, CONFIG, API,

  // Auth
  setUser: u => AppState.setUser(u),
  currentUser: () => AppState.currentUser,
  can,
  saveToken, clearToken,

  // Prácticas
  addPractice, publishPractice, unpublishPractice, deletePractice, saveFromEditor,

  // Alumnos
  enrollStudent, removeStudent, updateStudent, submitEnrollForm,

  // Entregas
  submitWork, gradeSubmissionAction, submitGradeFromForum, selectSubmission,

  // Materiales
  addMaterial, deleteMaterial, saveMaterial, handleMaterialUpload,

  // Archivos
  validateFile, handlePhotoUpload, handleEditorFiles, renderEditorFileList,

  // Quiz
  buildQuizHTML, selectQuizOpt, submitQuizFromModal, resetQuizInModal,

  // Render
  renderStudentPractices, buildPracticeCardHTML,
  renderTeacherPractices,
  renderStudentTasks,
  renderPendingSubmissions,
  renderStudentList, renderStudentCount,
  renderLabMaterials, renderMaterialList,
  populateForumSelects, populateMaterialSelects,

  // Editor
  addStep, addCustomComponent, clearEditor,

  // Utils
  notify, formatBytes, formatDate, generateId,
};


// ============================================================
// ARRANQUE
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Demo: usar alumno por defecto hasta que implementes login
  // Cuando tengas login, reemplaza esto con:
  //   const user = await API.auth.me();
  //   AppState.setUser(user);
  AppState.setUser({
    id:       'stu-demo',
    name:     'Juan Méndez',
    initials: 'JM',
    role:     'student',
    group:    'G2',
  });

  // Render inicial (los datos vienen del servidor)
  await Promise.all([
    renderStudentPractices(),
    renderStudentTasks(),
  ]);
});
