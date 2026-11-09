// Carga el contenido editable (Panel administrador) y redibuja las secciones.
// Si la API falla, se mantiene el contenido escrito en el HTML.
(function () {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // *texto* → negrita
  const negrita = (t) => esc(t).replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  // Nombre de software: si no tiene *…*, la última palabra va en negrita (ej. "VIMOD Gestión").
  const nombreSoftware = (n) => (String(n).includes('*') ? negrita(n) : esc(n).replace(/(\S+)$/, '<strong>$1</strong>'));
  const urlImagen = (u) => (/^(https?:\/\/|\/imagenes\/)/i.test(u || '') ? u : '');
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => String(x || '').trim()) : []);

  function mostrar() {
    document.documentElement.classList.remove('cargando-sitio');
  }
  const respaldo = setTimeout(mostrar, 3000); // si tarda, se muestra el contenido original

  function nosotros(c) {
    const img = urlImagen(c.imagen);
    return `
      <div class="contenedor nosotros">
        <div class="nosotros__img revelar">${img ? `<img src="${esc(img)}" alt="${esc(c.etiqueta)}" loading="lazy">` : ''}</div>
        <div class="revelar">
          <span class="etiqueta">${esc(c.etiqueta)}</span>
          <h2 class="titulo">${negrita(c.titulo)}</h2>
          ${lista(c.parrafos).map((p, i) => `<p class="texto"${i ? ' style="margin-top:14px"' : ''}>${esc(p)}</p>`).join('')}
          ${(c.cifras || []).length ? `<div class="cifras">${c.cifras.map((x) => `
            <div class="cifra"><b data-contar="${Number(x.valor) || 0}">0</b><span>${esc(x.texto)}</span></div>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }

  let listaProyectos = [];

  function proyectos(c) {
    const items = (c.items || []).filter((p) => p && (p.titulo || p.imagen));
    listaProyectos = items;
    return `
      <div class="contenedor">
        <div class="proyectos__cabecera revelar">
          <div>
            <span class="etiqueta">${esc(c.etiqueta)}</span>
            <h2 class="titulo" style="margin:0">${negrita(c.titulo)}</h2>
          </div>
          ${c.texto ? `<p class="texto" style="max-width:40ch">${esc(c.texto)}</p>` : ''}
        </div>
        <div class="galeria" data-cantidad="${items.length}">${items.map((p, i) => {
          const img = urlImagen(p.imagen);
          return `
          <article class="proyecto proyecto--clic revelar" data-proyecto="${i}" tabindex="0" role="button" aria-label="Ver detalles de ${esc(p.titulo)}">
            ${img ? `<img src="${esc(img)}" alt="${esc(p.titulo)}" loading="lazy">` : ''}
            <div class="proyecto__info">
              <div><p>${esc(p.categoria)}</p><h3>${esc(p.titulo)}</h3></div>
              <span class="proyecto__ver">Ver proyecto <span class="flecha">→</span></span>
            </div>
          </article>`;
        }).join('')}</div>
      </div>`;
  }

  // ---- Ventana con el detalle de un proyecto ----
  const enlaceSeguro = (u) => (/^https?:\/\/\S+$/i.test(u || '') ? u : '');
  let modal, fotos = [], fotoActual = 0, focoPrevio = null;

  function crearModal() {
    modal = document.createElement('div');
    modal.className = 'modal modal--proyecto';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'detalleTitulo');
    modal.innerHTML = '<div class="detalle"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-cerrar]')) return cerrarDetalle();
      const mini = e.target.closest('[data-foto]');
      if (mini) return mostrarFoto(Number(mini.dataset.foto));
      if (e.target.closest('[data-anterior]')) return mostrarFoto(fotoActual - 1);
      if (e.target.closest('[data-siguiente]')) return mostrarFoto(fotoActual + 1);
    });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('abierto')) return;
      if (e.key === 'Escape') cerrarDetalle();
      if (e.key === 'ArrowLeft') mostrarFoto(fotoActual - 1);
      if (e.key === 'ArrowRight') mostrarFoto(fotoActual + 1);
    });
  }

  function mostrarFoto(i) {
    if (!fotos.length) return;
    fotoActual = (i + fotos.length) % fotos.length;
    const principal = modal.querySelector('.detalle__foto img');
    principal.src = fotos[fotoActual];
    modal.querySelectorAll('[data-foto]').forEach((b, k) => b.classList.toggle('activo', k === fotoActual));
    const contador = modal.querySelector('.detalle__contador');
    if (contador) contador.textContent = `${fotoActual + 1} / ${fotos.length}`;
    modal.querySelector(`[data-foto="${fotoActual}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function abrirDetalle(p) {
    if (!modal) crearModal();
    fotos = [p.imagen, ...(p.imagenes || [])].map(urlImagen).filter(Boolean);
    fotos = [...new Set(fotos)];
    fotoActual = 0;
    const enlace = enlaceSeguro(p.enlace);
    const parrafos = String(p.descripcion || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    const varias = fotos.length > 1;
    modal.querySelector('.detalle').innerHTML = `
      <button class="detalle__cerrar" type="button" data-cerrar aria-label="Cerrar">×</button>
      ${fotos.length ? `
      <div class="detalle__visor">
        <div class="detalle__foto">
          <img src="${esc(fotos[0])}" alt="${esc(p.titulo)}">
          ${varias ? `
          <button class="detalle__flecha detalle__flecha--izq" type="button" data-anterior aria-label="Imagen anterior">‹</button>
          <button class="detalle__flecha detalle__flecha--der" type="button" data-siguiente aria-label="Imagen siguiente">›</button>
          <span class="detalle__contador">1 / ${fotos.length}</span>` : ''}
        </div>
        ${varias ? `<div class="detalle__miniaturas">${fotos.map((f, i) => `
          <button type="button" data-foto="${i}" class="${i ? '' : 'activo'}" aria-label="Ver imagen ${i + 1}">
            <img src="${esc(f)}" alt="" loading="lazy">
          </button>`).join('')}</div>` : ''}
      </div>` : ''}
      <div class="detalle__cuerpo">
        ${p.categoria ? `<span class="etiqueta">${esc(p.categoria)}</span>` : ''}
        <h3 class="detalle__titulo" id="detalleTitulo">${esc(p.titulo)}</h3>
        ${parrafos.length ? parrafos.map((x) => `<p class="texto">${esc(x)}</p>`).join('') : ''}
        ${enlace ? `<a class="btn" href="${esc(enlace)}" target="_blank" rel="noopener">Visitar sitio <span class="flecha">→</span></a>` : ''}
      </div>`;
    focoPrevio = document.activeElement;
    modal.classList.add('abierto');
    document.documentElement.classList.add('sin-scroll');
    modal.querySelector('.detalle').scrollTop = 0;
    modal.querySelector('[data-cerrar]').focus({ preventScroll: true });
  }

  function cerrarDetalle() {
    modal.classList.remove('abierto');
    document.documentElement.classList.remove('sin-scroll');
    if (focoPrevio) focoPrevio.focus({ preventScroll: true });
  }

  function activarProyecto(e) {
    const tarjeta = e.target.closest('[data-proyecto]');
    if (!tarjeta) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const p = listaProyectos[Number(tarjeta.dataset.proyecto)];
    if (p) abrirDetalle(p);
  }
  document.addEventListener('click', activarProyecto);
  document.addEventListener('keydown', activarProyecto);

  function softwares(c, lista_) {
    if (!lista_.length) return '';
    return lista_.map((s, i) => {
      const enlace = `planes.html?s=${encodeURIComponent(s._id)}`;
      const img = urlImagen(s.imagen);
      const hayPlanes = (s.planes || []).length > 0;
      return `
      <div class="contenedor software${i % 2 ? ' software--invertido' : ''}">
        <div class="revelar">
          ${i === 0 ? `<span class="etiqueta">${esc(c.etiqueta)}</span>` : ''}
          <h2 class="titulo">${negrita(s.titulo || s.nombre)}</h2>
          ${s.descripcion ? `<p class="texto">${esc(s.descripcion)}</p>` : ''}
          ${lista(s.caracteristicas).length ? `<ul class="lista-check">${lista(s.caracteristicas).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${hayPlanes ? `<a href="${enlace}" class="btn">Ver planes <span class="flecha">→</span></a>` : '<a href="#contacto" class="btn">Más información <span class="flecha">→</span></a>'}
        </div>
        <a href="${hayPlanes ? enlace : '#contacto'}" class="software__card revelar">
          ${img ? `<img src="${esc(img)}" alt="${esc(s.nombre)}" loading="lazy">` : ''}
          <div class="software__card-cuerpo">
            <h3>${nombreSoftware(s.nombre)}</h3>
            ${s.etiqueta ? `<span class="chip">${esc(s.etiqueta)}</span>` : ''}
            ${s.resumen ? `<p class="texto">${esc(s.resumen)}</p>` : ''}
          </div>
        </a>
      </div>`;
    }).join('');
  }

  function contacto(c) {
    const datos = [
      ['Correo', c.correo && `<a href="mailto:${esc(c.correo)}">${esc(c.correo)}</a>`],
      ['Teléfono', c.telefono && esc(c.telefono)],
      ['Dirección', c.direccion && esc(c.direccion)],
      ['Horario', c.horario && esc(c.horario)]
    ].filter(([, v]) => v);
    return `
      <span class="etiqueta">${esc(c.etiqueta)}</span>
      <h2 class="titulo">${negrita(c.titulo)}</h2>
      ${c.texto ? `<p class="texto">${esc(c.texto)}</p>` : ''}
      <ul class="datos-contacto">${datos.map(([k, v]) => `<li><b>${k}</b>${v}</li>`).join('')}</ul>`;
  }

  function observarNuevos() {
    if (typeof observador === 'undefined') {
      document.querySelectorAll('.revelar').forEach((el) => el.classList.add('visible'));
      return;
    }
    document.querySelectorAll('.revelar:not(.visible)').forEach((el) => observador.observe(el));
  }

  fetch('/api/sitio')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sin datos'))))
    .then(({ contenido: c, softwares: sw }) => {
      const secc = (id) => document.getElementById(id);
      if (secc('nosotros')) secc('nosotros').innerHTML = nosotros(c.nosotros);
      if (secc('proyectos')) secc('proyectos').innerHTML = proyectos(c.proyectos);
      if (secc('softwares')) {
        const html = softwares(c.softwares, sw);
        if (html) secc('softwares').innerHTML = html;
        else secc('softwares').hidden = true;
      }
      const colContacto = document.querySelector('#contacto .contacto > div');
      if (colContacto) colContacto.innerHTML = contacto(c.contacto);
      observarNuevos();
    })
    .catch(() => {})
    .finally(() => {
      clearTimeout(respaldo);
      mostrar();
    });
})();
