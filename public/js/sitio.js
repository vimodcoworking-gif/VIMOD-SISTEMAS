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

  function proyectos(c) {
    const items = (c.items || []).filter((p) => p && (p.titulo || p.imagen));
    return `
      <div class="contenedor">
        <div class="proyectos__cabecera revelar">
          <div>
            <span class="etiqueta">${esc(c.etiqueta)}</span>
            <h2 class="titulo" style="margin:0">${negrita(c.titulo)}</h2>
          </div>
          ${c.texto ? `<p class="texto" style="max-width:40ch">${esc(c.texto)}</p>` : ''}
        </div>
        <div class="galeria">${items.map((p, i) => {
          const img = urlImagen(p.imagen);
          return `
          <article class="proyecto${i === 0 && items.length > 1 ? ' proyecto--ancho' : ''} revelar">
            ${img ? `<img src="${esc(img)}" alt="${esc(p.titulo)}" loading="lazy">` : ''}
            <div class="proyecto__info"><p>${esc(p.categoria)}</p><h3>${esc(p.titulo)}</h3></div>
          </article>`;
        }).join('')}</div>
      </div>`;
  }

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
