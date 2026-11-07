// API del área de clientes: login y "Mi cuenta".
const express = require('express');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Licencia = require('../models/Licencia');
const Sistema = require('../models/Sistema');
const Solicitud = require('../models/Solicitud');
const Empresa = require('../models/Empresa');
const cifrado = require('../lib/cifrado');
const auth = require('../lib/auth');

const router = express.Router();
const COOKIE = 'vimod_sesion';
const HORAS = 24 * 7;
const HASH_FALSO = auth.hashPassword('sin-usuario'); // para que el tiempo de respuesta no delate si el correo existe

const a = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const nombrePlan = (sistema, codigo) => Sistema.nombrePlan(sistema, codigo);

router.use((req, res, next) =>
  mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Base de datos no disponible' })
);

// ---- Sesión ----
router.post('/auth/login', auth.limitador(10, 15 * 60e3), a(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Ingresa tu correo y contraseña' });

  const u = await Usuario.findOne({ email }).select('+passwordHash');
  const ok = auth.verificarPassword(password, u ? u.passwordHash : HASH_FALSO);
  if (!u || !ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  if (!u.activo) return res.status(403).json({ error: 'Tu cuenta está desactivada. Contáctanos para reactivarla.' });

  await Usuario.updateOne({ _id: u._id }, { ultimoAcceso: new Date() });
  auth.iniciarSesion(req, res, COOKIE, { sub: u.id }, HORAS);
  res.json({ ok: true });
}));

// ---- Inicio de sesión con Google ----
// El navegador recibe de Google un "ID token" (JWT firmado) y lo envía aquí;
// se valida con el servicio tokeninfo de Google.
async function verificarTokenGoogle(credential) {
  const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!res.ok) return null;
  const t = await res.json();
  const emisorOk = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  const vigente = Number(t.exp) * 1000 > Date.now();
  if (t.aud !== process.env.GOOGLE_CLIENT_ID || !emisorOk || !vigente) return null;
  if (t.email_verified !== true && t.email_verified !== 'true') return null;
  return t;
}

router.post('/auth/google', auth.limitador(20, 15 * 60e3), a(async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'El inicio con Google no está configurado' });
  const credential = String(req.body.credential || '');
  if (!credential) return res.status(400).json({ error: 'Falta la credencial de Google' });

  const t = await verificarTokenGoogle(credential);
  if (!t) return res.status(401).json({ error: 'No se pudo verificar tu cuenta de Google. Inténtalo de nuevo.' });

  const email = String(t.email).toLowerCase();
  let u = await Usuario.findOne({ $or: [{ googleId: t.sub }, { email }] });
  let nuevo = false;
  if (u) {
    if (!u.activo) return res.status(403).json({ error: 'Tu cuenta está desactivada. Contáctanos para reactivarla.' });
    if (!u.googleId) u.googleId = t.sub; // vincula Google a una cuenta existente con el mismo correo
  } else {
    u = new Usuario({ nombre: t.name || email.split('@')[0], email, googleId: t.sub });
    nuevo = true;
  }
  u.ultimoAcceso = new Date();
  await u.save();
  auth.iniciarSesion(req, res, COOKIE, { sub: u.id }, HORAS);
  res.status(nuevo ? 201 : 200).json({ ok: true, nuevo });
}));

// Registro de nuevos clientes desde la página.
router.post('/auth/registro', auth.limitador(5, 60 * 60e3), a(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!nombre || !email) return res.status(400).json({ error: 'Ingresa tu nombre y correo' });
  if (!/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'El correo no es válido' });
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  if (await Usuario.exists({ email })) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
  }
  try {
    const u = await Usuario.create({
      nombre,
      email,
      empresa: req.body.empresa,
      telefono: req.body.telefono,
      passwordHash: auth.hashPassword(password),
      ultimoAcceso: new Date()
    });
    auth.iniciarSesion(req, res, COOKIE, { sub: u.id }, HORAS);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
    throw err;
  }
}));

router.post('/auth/logout', (req, res) => {
  auth.cerrarSesion(req, res, COOKIE);
  res.json({ ok: true });
});

const requiereSesion = a(async (req, res, next) => {
  const sesion = auth.leerSesion(req, COOKIE);
  const u = sesion && mongoose.isValidObjectId(sesion.sub) ? await Usuario.findById(sesion.sub) : null;
  if (!u || !u.activo) {
    auth.cerrarSesion(req, res, COOKIE);
    return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  }
  req.usuario = u;
  next();
});

// ---- Mi cuenta ----
const perfil = (u) => ({
  google: !!u.googleId,
  nombre: u.nombre,
  email: u.email,
  empresa: u.empresa || '',
  telefono: u.telefono || '',
  creado: u.createdAt,
  ultimoAcceso: u.ultimoAcceso
});

router.get('/cuenta', requiereSesion, a(async (req, res) => {
  const conClave = await Usuario.exists({ _id: req.usuario._id, passwordHash: { $exists: true, $ne: null } });
  res.json({ ...perfil(req.usuario), tienePassword: !!conClave });
}));

router.put('/cuenta', requiereSesion, a(async (req, res) => {
  const { nombre, empresa, telefono } = req.body;
  Object.assign(req.usuario, { nombre, empresa, telefono });
  await req.usuario.save();
  res.json(perfil(req.usuario));
}));

router.put('/cuenta/password', requiereSesion, a(async (req, res) => {
  const actual = String(req.body.actual || '');
  const nueva = String(req.body.nueva || '');
  if (nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  const u = await Usuario.findById(req.usuario._id).select('+passwordHash');
  // Las cuentas creadas con Google no tienen contraseña: pueden crear una sin indicar la actual.
  if (u.passwordHash && !auth.verificarPassword(actual, u.passwordHash)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta' });
  }
  u.passwordHash = auth.hashPassword(nueva);
  await u.save();
  res.json({ ok: true });
}));

router.get('/cuenta/licencias', requiereSesion, a(async (req, res) => {
  const licencias = await Licencia.find({ usuario: req.usuario._id }).populate('sistema').sort('-createdAt');
  res.json(
    licencias.map((l) => ({
      id: l.id,
      sistema: l.sistema
        ? { id: l.sistema.id, nombre: l.sistema.nombre, descripcion: l.sistema.descripcion || '', url: l.sistema.url || '' }
        : { id: null, nombre: 'Sistema no disponible', descripcion: '', url: '' },
      plan: l.plan,
      planNombre: nombrePlan(l.sistema, l.plan),
      clave: l.clave,
      estado: l.estadoReal,
      fechaInicio: l.fechaInicio,
      fechaVencimiento: l.fechaVencimiento,
      maxUsuarios: l.maxUsuarios,
      precio: l.precio,
      periodo: l.periodo
    }))
  );
}));

router.get('/cuenta/solicitudes', requiereSesion, a(async (req, res) => {
  const lista = await Solicitud.find({ email: req.usuario.email }).populate('sistema', 'nombre planes').sort('-createdAt').limit(50);
  res.json(lista.map((s) => ({
    id: s.id,
    software: s.sistema ? s.sistema.nombre : '',
    plan: nombrePlan(s.sistema, s.plan),
    estado: s.estado || 'pendiente',
    fecha: s.createdAt
  })));
}));

// ---- Sistema propio de la empresa (VIMOD CONTROL en el servidor) ----
router.get('/cuenta/empresas', requiereSesion, a(async (req, res) => {
  const lista = await Empresa.find({ usuario: req.usuario._id }).select('+adminClave').sort('-createdAt').lean();
  res.json(lista.map((e) => ({
    id: String(e._id),
    nombre: e.nombre,
    estado: e.estado, // pendiente | lista | error
    url: e.estado === 'lista' && /^https?:\/\//i.test(e.url || '') ? e.url : '',
    adminUsuario: e.adminUsuario,
    tieneClave: !!e.adminClave && cifrado.disponible(),
    claveVista: e.claveVista,
    licencia: e.licenciaServidor && e.licenciaServidor.estado ? e.licenciaServidor : { estado: e.estado === 'lista' ? 'activa' : '', vence: e.vence }
  })));
}));

router.get('/cuenta/empresas/:id/clave', requiereSesion, a(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'No encontrado' });
  const e = await Empresa.findOne({ _id: req.params.id, usuario: req.usuario._id }).select('+adminClave');
  if (!e || !e.adminClave) return res.status(404).json({ error: 'La contraseña ya no está disponible. Pídela a VIMOD.' });
  const clave = cifrado.descifrar(e.adminClave);
  if (!clave) return res.status(503).json({ error: 'No se pudo mostrar la contraseña. Pídela a VIMOD.' });
  if (!e.claveVista) await Empresa.updateOne({ _id: e._id }, { claveVista: new Date() });
  res.json({ usuario: e.adminUsuario, clave, url: e.url });
}));

// Errores de validación → 400; el resto → 500.
router.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = router;
