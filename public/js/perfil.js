// "Mi cuenta": perfil, sistemas, licencias y solicitudes del cliente.
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FMT = { day: '2-digit', month: 'short', year: 'numeric' };
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es', FMT) : '—');
// Fechas de licencia: se guardan como día (UTC) y se muestran sin desfase horario.
const fechaDia = (d) => (d ? new Date(d).toLocaleDateString('es', { ...FMT, timeZone: 'UTC' }) : '—');
const DIA = 86400e3;
const ESTADOS = {
  activa: 'Activa', suspendida: 'Suspendida', vencida: 'Vencida',
  pendiente: 'Pendiente', contactado: 'Contactado', atendida: 'Atendida', descartada: 'Descartada'
};
const insignia = (estado) => `<span class="insignia insignia--${esc(estado)}">${esc(ESTADOS[estado] || estado)}</span>`;
const urlSegura = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const precioLicencia = (l) =>
  l.precio == null ? '—' : `$${Number(l.precio).toLocaleString('es', { maximumFractionDigits: 2 })}${l.periodo ? ' / ' + esc(l.periodo) : ''}`;

async function api(url, opciones = {}) {
  const res = await fetch('/api' + url, {
    method: opciones.method || 'GET',
    headers: opciones.body ? { 'Content-Type': 'application/json' } : {},
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.replace('acceder.html');
    throw new Error(json.error || 'Sesión expirada');
  }
  if (!res.ok) throw new Error(json.error || 'Ocurrió un error');
  return json;
}

// ---- Pestañas ----
const pestañas = ['resumen', 'sistemas', 'licencias', 'solicitudes', 'perfil'];
function mostrarPestaña() {
  const actual = pestañas.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'resumen';
  document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== actual));
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('activo', a.dataset.tab === actual));
}
window.addEventListener('hashchange', () => { mostrarPestaña(); window.scrollTo(0, 0); });
mostrarPestaña();

// ---- Datos ----
function pintarPerfil(u) {
  $('uNombre').textContent = u.nombre;
  $('uEmail').textContent = u.email;
  $('saludo').textContent = u.nombre.split(' ')[0];
  $('avatar').textContent = u.nombre.split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  const f = $('formPerfil');
  f.nombre.value = u.nombre;
  f.email.value = u.email;
  f.empresa.value = u.empresa;
  f.telefono.value = u.telefono;
  $('infoCuenta').textContent = `Cliente desde ${fecha(u.creado)} · Último acceso ${fecha(u.ultimoAcceso)}` +
    (u.google ? ' · Vinculada con Google' : '');
  // Cuenta sin contraseña (creada con Google): se crea una sin pedir la actual.
  if (u.tienePassword !== undefined) {
    const sinClave = !u.tienePassword;
    $('campoActual').hidden = sinClave;
    $('formClave').actual.required = !sinClave;
    $('notaClave').hidden = !sinClave;
    $('tituloClave').textContent = sinClave ? 'Crear contraseña' : 'Cambiar contraseña';
  }
}

// Un sistema puede tener varias licencias: se muestra la más vigente.
function agruparSistemas(licencias) {
  const prioridad = { activa: 0, suspendida: 1, vencida: 2 };
  const mapa = new Map();
  licencias.forEach((l) => {
    const clave = l.sistema.id || l.id;
    const previa = mapa.get(clave);
    if (!previa || prioridad[l.estado] < prioridad[previa.estado]) mapa.set(clave, l);
  });
  return [...mapa.values()];
}

function tarjetaSistema(l) {
  const url = urlSegura(l.sistema.url);
  const accion = l.estado === 'activa'
    ? (url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Abrir sistema <span class="flecha">→</span></a>`
           : '<span class="texto texto--chico">El enlace de acceso estará disponible pronto.</span>')
    : '<a class="btn btn--borde" href="index.html#contacto">Renovar <span class="flecha">→</span></a>';
  return `
    <article class="sistema">
      <div class="sistema__cabecera">
        <h3>${esc(l.sistema.nombre)}</h3>
        ${insignia(l.estado)}
      </div>
      <p class="sistema__desc">${esc(l.sistema.descripcion) || 'Software VIMOD.'}</p>
      <ul class="sistema__datos">
        <li><b>Plan</b>${esc(l.planNombre)}</li>
        <li><b>Vence</b>${l.fechaVencimiento ? fechaDia(l.fechaVencimiento) : 'Sin vencimiento'}</li>
        <li><b>Usuarios</b>${l.maxUsuarios || 'Ilimitados'}</li>
        ${l.precio != null ? `<li><b>Precio</b>${precioLicencia(l)}</li>` : ''}
      </ul>
      ${accion}
    </article>`;
}

const vacio = (texto, enlace) =>
  `<div class="vacio"><p>${texto}</p>${enlace ? `<a class="btn btn--borde" href="planes.html">Ver planes <span class="flecha">→</span></a>` : ''}</div>`;

function pintarLicencias(licencias) {
  const sistemas = agruparSistemas(licencias);
  const activas = licencias.filter((l) => l.estado === 'activa');
  const proxima = activas.filter((l) => l.fechaVencimiento).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))[0];

  $('tSistemas').textContent = sistemas.filter((s) => s.estado === 'activa').length;
  $('tLicencias').textContent = activas.length;
  $('tVence').textContent = proxima ? fechaDia(proxima.fechaVencimiento) : '—';

  // Avisos de vencimiento
  const ahora = Date.now();
  const avisos = licencias
    .map((l) => {
      if (l.estado === 'vencida') return `Tu licencia de <b>${esc(l.sistema.nombre)}</b> está vencida.`;
      if (l.estado === 'suspendida') return `Tu licencia de <b>${esc(l.sistema.nombre)}</b> está suspendida.`;
      if (l.fechaVencimiento) {
        const dias = Math.ceil((new Date(l.fechaVencimiento) - ahora) / DIA);
        if (dias <= 30) return `Tu licencia de <b>${esc(l.sistema.nombre)}</b> vence en ${dias} día${dias === 1 ? '' : 's'}.`;
      }
      return null;
    })
    .filter(Boolean);
  $('avisos').innerHTML = avisos.length
    ? `<div class="aviso-caja">${avisos.map((t) => `<p>${t}</p>`).join('')}<a href="index.html#contacto">Contáctanos para renovar →</a></div>`
    : '';

  const tarjetas = sistemas.map(tarjetaSistema).join('');
  $('listaSistemas').innerHTML = tarjetas || vacio('Aún no tienes sistemas adquiridos.', true);
  $('accesoRapido').innerHTML =
    sistemas.filter((s) => s.estado === 'activa').map(tarjetaSistema).join('') || vacio('No tienes sistemas activos en este momento.', true);

  $('tablaLicencias').innerHTML = licencias.length
    ? licencias.map((l) => `
        <tr>
          <td data-col="Sistema">${esc(l.sistema.nombre)}</td>
          <td data-col="Plan">${esc(l.planNombre)}</td>
          <td data-col="Precio">${precioLicencia(l)}</td>
          <td data-col="Clave"><code class="clave">${esc(l.clave)}</code> <button class="copiar" type="button" data-copiar="${esc(l.clave)}">Copiar</button></td>
          <td data-col="Inicio">${fechaDia(l.fechaInicio)}</td>
          <td data-col="Vence">${l.fechaVencimiento ? fechaDia(l.fechaVencimiento) : 'Sin vencimiento'}</td>
          <td data-col="Usuarios">${l.maxUsuarios || 'Ilimitados'}</td>
          <td data-col="Estado">${insignia(l.estado)}</td>
        </tr>`).join('')
    : '<tr><td colspan="8" class="tabla__vacia">No tienes licencias registradas.</td></tr>';
}

function pintarSolicitudes(lista) {
  $('tablaSolicitudes').innerHTML = lista.length
    ? lista.map((s) => `
        <tr>
          <td data-col="Fecha">${fecha(s.fecha)}</td>
          <td data-col="Plan">${s.software ? esc(s.software) + " · " : ""}${esc(s.plan)}</td>
          <td data-col="Estado">${insignia(s.estado)}</td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="tabla__vacia">No has enviado solicitudes.</td></tr>';
}

async function cargar() {
  try {
    const [usuario, licencias, solicitudes] = await Promise.all([
      api('/cuenta'), api('/cuenta/licencias'), api('/cuenta/solicitudes')
    ]);
    pintarPerfil(usuario);
    pintarLicencias(licencias);
    pintarSolicitudes(solicitudes);
  } catch (err) {
    $('avisos').innerHTML = `<div class="aviso-caja"><p>${esc(err.message)}</p></div>`;
  } finally {
    $('cuenta').removeAttribute('aria-busy');
  }
}

// ---- Acciones ----
document.addEventListener('click', async (e) => {
  const boton = e.target.closest('[data-copiar]');
  if (!boton) return;
  try {
    await navigator.clipboard.writeText(boton.dataset.copiar);
    boton.textContent = 'Copiada';
    setTimeout(() => (boton.textContent = 'Copiar'), 1500);
  } catch { /* el portapapeles puede no estar disponible */ }
});

$('formPerfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const estado = $('estadoPerfil');
  estado.textContent = 'Guardando…';
  try {
    const u = await api('/cuenta', { method: 'PUT', body: { nombre: f.nombre.value, empresa: f.empresa.value, telefono: f.telefono.value } });
    pintarPerfil(u);
    estado.textContent = 'Datos actualizados.';
  } catch (err) {
    estado.textContent = 'Error: ' + err.message;
  }
});

$('formClave').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const estado = $('estadoClave');
  if (f.nueva.value.length < 8) return (estado.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.');
  if (f.nueva.value !== f.repetir.value) return (estado.textContent = 'Las contraseñas no coinciden.');
  estado.textContent = 'Actualizando…';
  try {
    await api('/cuenta/password', { method: 'PUT', body: { actual: f.actual.value, nueva: f.nueva.value } });
    const eraNueva = $('campoActual').hidden;
    f.reset();
    if (eraNueva) pintarPerfil(await api('/cuenta'));
    estado.textContent = eraNueva ? 'Contraseña creada. Ya puedes entrar también con tu correo.' : 'Contraseña actualizada.';
  } catch (err) {
    estado.textContent = 'Error: ' + err.message;
  }
});

$('salir').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});

cargar();
