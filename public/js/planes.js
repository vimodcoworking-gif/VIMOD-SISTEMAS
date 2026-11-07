// Planes de cada software (editables desde el Panel administrador).
const contenedorPlanes = document.getElementById('planes');
const modal = document.getElementById('modal');
const formSolicitud = document.getElementById('formSolicitud');
const estadoSolicitud = document.getElementById('estadoSolicitud');
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
    <button class="btn" type="button">${p.precio != null ? 'Elegir plan' : 'Contactar'} <span class="flecha">→</span></button>`;

  art.querySelector('.plan__nombre').textContent = p.nombre;
  art.querySelector('.plan__desc').textContent = p.descripcion || '';
  const ul = art.querySelector('.lista-check');
  (p.caracteristicas || []).forEach((c) => {
    const li = document.createElement('li');
    li.textContent = c;
    ul.appendChild(li);
  });
  art.querySelector('button').addEventListener('click', () => abrirModal(p, software));
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

function abrirModal(plan, software) {
  formSolicitud.sistema.value = software._id;
  formSolicitud.plan.value = plan.codigo;
  document.querySelector('#modalTitulo strong').textContent = plan.nombre;
  document.getElementById('modalSoftware').textContent = software.nombre;
  estadoSolicitud.textContent = '';
  modal.classList.add('abierto');
  formSolicitud.nombre.focus();
}
function cerrarModal() { modal.classList.remove('abierto'); }

document.getElementById('modalCerrar').addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

formSolicitud.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { sistema, plan } = { sistema: formSolicitud.sistema.value, plan: formSolicitud.plan.value };
  await enviarFormulario(formSolicitud, '/api/solicitudes', estadoSolicitud);
  formSolicitud.sistema.value = sistema;
  formSolicitud.plan.value = plan;
});

cargarPlanes();
