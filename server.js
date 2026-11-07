require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const Contacto = require('./models/Contacto');
const Solicitud = require('./models/Solicitud');
const planes = require('./data/planes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.set('trust proxy', 1); // Render está detrás de un proxy HTTPS
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---- Conexión a MongoDB ----
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('✔ Conectado a MongoDB'))
    .catch((err) => console.error('✖ Error conectando a MongoDB:', err.message));
} else {
  console.warn('⚠ MONGODB_URI no definido: los formularios no se guardarán.');
}

const dbLista = () => mongoose.connection.readyState === 1;

// ---- API ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: dbLista() ? 'conectada' : 'desconectada' });
});

app.get('/api/planes', (req, res) => {
  res.json(planes);
});

app.post('/api/contacto', async (req, res) => {
  if (!dbLista()) return res.status(503).json({ error: 'Base de datos no disponible' });
  try {
    const { nombre, email, mensaje } = req.body;
    const doc = await Contacto.create({ nombre, email, mensaje });
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/solicitudes', async (req, res) => {
  if (!dbLista()) return res.status(503).json({ error: 'Base de datos no disponible' });
  try {
    const { plan, nombre, empresa, email, telefono } = req.body;
    if (!planes.some((p) => p.id === plan)) {
      return res.status(400).json({ error: 'Plan no válido' });
    }
    const doc = await Solicitud.create({ plan, nombre, empresa, email, telefono });
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Configuración pública para el navegador (el Client ID de Google no es secreto)
app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

// Área de clientes: login y "Mi cuenta"
app.use('/api', require('./routes/cuenta'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`VIMOD escuchando en http://localhost:${PORT}`));
