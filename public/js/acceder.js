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

// ---- Inicio de sesión con Google (solo si el servidor tiene GOOGLE_CLIENT_ID) ----
async function iniciarGoogle() {
  let clientId;
  try {
    clientId = (await fetch('/api/config').then((r) => r.json())).googleClientId;
  } catch { return; }
  if (!clientId) return;

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    const bloque = document.getElementById('bloqueGoogle');
    const contenedor = document.getElementById('botonGoogle');
    const estado = document.getElementById('estadoGoogle');
    bloque.hidden = false;
    google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: async ({ credential }) => {
        estado.textContent = 'Verificando con Google…';
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || 'No se pudo iniciar sesión con Google');
          location.href = 'perfil.html';
        } catch (err) {
          estado.textContent = err.message;
        }
      }
    });
    google.accounts.id.renderButton(contenedor, {
      theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', locale: 'es',
      width: Math.min(400, contenedor.clientWidth || 360)
    });
  };
  document.head.appendChild(script);
}
iniciarGoogle();

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
