// Planes de cada software (editables desde el Panel administrador).
const contenedorPlanes = document.getElementById('planes');
const selector = document.getElementById('selectorSoftware');
let softwares = [];

const precioTexto = (p) => {
  if (p.precio == null) return '<div class="plan__precio plan__precio--texto">A medida</div>';
  const precio = Number(p.precio).toLocaleString('es', { maximumFractionDigits: 2 });
  const periodo = p.periodo ? `<small> / ${p.periodo.replace(/[<>&]/g, '')}</small>` : '';
  return `<div class="plan__precio">$${precio}${periodo}</div>`;
};

function tarjetaPlan(p, software) {
  const art = document.createElement('article');
  art.className = 'plan revelar' + (p.destacado ? ' plan--destacado' : '');
  art.innerHTML = `
    ${p.destacado ? '<span class="plan__badge">Más elegido</span>' : ''}
    <h2 class="plan__nombre"></h2>
    ${precioTexto(p)}
    <p class="plan__desc"></p>
    <ul class="lista-check"></ul>
    <button class="btn" type="button">${p.precio != null ? 'Elegir plan' : 'Solicitar cotización'} <span class="flecha">→</span></button>`;

  art.querySelector('.plan__nombre').textContent = p.nombre;
  art.querySelector('.plan__desc').textContent = p.descripcion || '';
  const ul = art.querySelector('.lista-check');
  (p.caracteristicas || []).forEach((c) => {
    const li = document.createElement('li');
    li.textContent = c;
    ul.appendChild(li);
  });
  art.querySelector('button').addEventListener('click', () => elegirPlan(p, software));
  return art;
}

function mostrarSoftware(s) {
  document.getElementById('planesSoftware').textContent = s.nombre;
  document.getElementById('planesTexto').textContent = s.textoPlanes || '';
  document.title = `Planes ${s.nombre} | VIMOD`;
  selector.querySelectorAll('a').forEach((a) => a.classList.toggle('activo', a.dataset.id === s._id));

  contenedorPlanes.innerHTML = '';
  contenedorPlanes.dataset.cantidad = s.planes.length;
  if (!s.planes.length) {
    contenedorPlanes.innerHTML = '<p class="texto planes__vacio">Pronto publicaremos los planes de este software. <a href="index.html#contacto">Contáctanos</a> para más información.</p>';
    return;
  }
  s.planes.forEach((p) => {
    const tarjeta = tarjetaPlan(p, s);
    contenedorPlanes.appendChild(tarjeta);
    observador.observe(tarjeta); // definido en main.js
  });
}

async function cargarPlanes() {
  try {
    const res = await fetch('/api/sitio');
    if (!res.ok) throw new Error();
    softwares = (await res.json()).softwares;
    if (!softwares.length) throw new Error();

    if (softwares.length > 1) {
      selector.hidden = false;
      selector.innerHTML = softwares.map((s) => `<a href="?s=${encodeURIComponent(s._id)}" data-id="${s._id}"></a>`).join('');
      selector.querySelectorAll('a').forEach((a, i) => {
        a.textContent = softwares[i].nombre;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          history.replaceState(null, '', a.getAttribute('href'));
          mostrarSoftware(softwares[i]);
        });
      });
    }
    const pedido = new URLSearchParams(location.search).get('s');
    mostrarSoftware(softwares.find((s) => s._id === pedido) || softwares.find((s) => s.planes.length) || softwares[0]);
  } catch {
    contenedorPlanes.innerHTML = '<p class="texto">No se pudieron cargar los planes. Inténtalo de nuevo en unos momentos.</p>';
  }
}

// Elegir un plan: se continúa en "Mi cuenta" (si no hay sesión, primero se inicia sesión).
function elegirPlan(plan, software) {
  const datos = new URLSearchParams({ s: software._id, plan: plan.codigo }).toString();
  const conSesion = /(?:^|;\s*)vimod_sesion_on=1/.test(document.cookie);
  location.href = (conSesion ? 'perfil.html?' : 'acceder.html?') + datos;
}

cargarPlanes();
