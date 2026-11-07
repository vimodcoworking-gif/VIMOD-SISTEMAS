// Si ya hay sesión, ir directo a "Mi cuenta".
if (/(?:^|;\s*)vimod_sesion_on=1/.test(document.cookie)) location.replace('perfil.html');

const formAcceso = document.getElementById('formAcceso');
const formRegistro = document.getElementById('formRegistro');
const campoClave = document.getElementById('a-password');

// ---- Pestañas Ingresar / Crear cuenta ----
function cambiarModo(modo) {
  const registro = modo === 'registro';
  formAcceso.hidden = registro;
  formRegistro.hidden = !registro;
  document.getElementById('ayudaIngresar').hidden = registro;
  document.getElementById('ayudaRegistro').hidden = !registro;
  document.getElementById('tituloAcceso').innerHTML = registro ? 'Crea tu <strong>cuenta</strong>' : 'Accede a tu <strong>cuenta</strong>';
  document.querySelectorAll('[data-modo]').forEach((b) => {
    const activo = b.dataset.modo === modo;
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-selected', activo);
  });
  document.title = (registro ? 'Crear cuenta' : 'Acceder') + ' | VIMOD';
  history.replaceState(null, '', registro ? '#registro' : location.pathname);
}
document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => cambiarModo(b.dataset.modo)));
document.querySelectorAll('[data-ir]').forEach((a) =>
  a.addEventListener('click', (e) => { e.preventDefault(); cambiarModo(a.dataset.ir); })
);
if (location.hash === '#registro') cambiarModo('registro');

document.getElementById('verClave').addEventListener('click', (e) => {
  const ver = campoClave.type === 'password';
  campoClave.type = ver ? 'text' : 'password';
  e.currentTarget.textContent = ver ? 'Ocultar' : 'Ver';
});

async function enviar(form, url, datos, estado) {
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  estado.textContent = 'Un momento…';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo completar');
    location.href = 'perfil.html';
  } catch (err) {
    estado.textContent = err.message;
    boton.disabled = false;
  }
}

formAcceso.addEventListener('submit', (e) => {
  e.preventDefault();
  const estado = document.getElementById('estadoAcceso');
  const datos = Object.fromEntries(new FormData(formAcceso));
  if (!datos.email || !datos.password) return (estado.textContent = 'Ingresa tu correo y contraseña.');
  enviar(formAcceso, '/api/auth/login', datos, estado);
});

formRegistro.addEventListener('submit', (e) => {
  e.preventDefault();
  const estado = document.getElementById('estadoRegistro');
  const { repetir, ...datos } = Object.fromEntries(new FormData(formRegistro));
  if (!datos.nombre.trim() || !datos.email.trim()) return (estado.textContent = 'Ingresa tu nombre y correo.');
  if (datos.password.length < 8) return (estado.textContent = 'La contraseña debe tener al menos 8 caracteres.');
  if (datos.password !== repetir) return (estado.textContent = 'Las contraseñas no coinciden.');
  enviar(formRegistro, '/api/auth/registro', datos, estado);
});
