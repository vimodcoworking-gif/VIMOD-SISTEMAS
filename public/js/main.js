// ---- Navegación: fondo al hacer scroll y menú móvil ----
const nav = document.getElementById('nav');
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
const esInicio = !!document.querySelector('.hero');

function actualizarNav() {
  if (esInicio) nav.classList.toggle('solida', window.scrollY > 60);
}
window.addEventListener('scroll', actualizarNav, { passive: true });
actualizarNav();

toggle.addEventListener('click', () => nav.classList.toggle('menu-abierto'));
links.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => nav.classList.remove('menu-abierto'))
);

// ---- Enlace "Acceder" → "Mi cuenta" si hay sesión iniciada ----
const enlaceAcceso = document.querySelector('[data-acceso]');
if (enlaceAcceso && /(?:^|;\s*)vimod_sesion_on=1/.test(document.cookie)) {
  enlaceAcceso.textContent = 'Mi cuenta';
  enlaceAcceso.href = 'perfil.html';
}

// ---- Revelar elementos al deslizar ----
const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      e.target.querySelectorAll('[data-contar]').forEach(contar);
      observador.unobserve(e.target);
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('.revelar').forEach((el) => observador.observe(el));

function contar(el) {
  const fin = Number(el.dataset.contar);
  const inicio = performance.now();
  const dur = 1500;
  (function paso(t) {
    const p = Math.min((t - inicio) / dur, 1);
    el.textContent = '+' + Math.round(fin * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(paso);
  })(inicio);
}

// ---- Enlace activo según la sección visible ----
if (esInicio) {
  const secciones = document.querySelectorAll('header[id], section[id]');
  const obsSeccion = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        links.querySelectorAll('a').forEach((a) =>
          a.classList.toggle('activo', a.getAttribute('href') === '#' + e.target.id)
        );
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  secciones.forEach((s) => obsSeccion.observe(s));
}

// ---- Envío de formularios a la API ----
async function enviarFormulario(form, url, estado) {
  const boton = form.querySelector('button[type="submit"]');
  const datos = Object.fromEntries(new FormData(form));
  boton.disabled = true;
  estado.textContent = 'Enviando…';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo enviar');
    form.reset();
    estado.textContent = '¡Gracias! Te contactaremos pronto.';
    return true;
  } catch (err) {
    estado.textContent = 'Error: ' + err.message;
    return false;
  } finally {
    boton.disabled = false;
  }
}

const formContacto = document.getElementById('formContacto');
if (formContacto) {
  formContacto.addEventListener('submit', (e) => {
    e.preventDefault();
    enviarFormulario(formContacto, '/api/contacto', document.getElementById('estadoContacto'));
  });
}

document.getElementById('anio').textContent = new Date().getFullYear();
