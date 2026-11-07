// Si ya hay sesión, ir directo a "Mi cuenta".
if (/(?:^|;\s*)vimod_sesion_on=1/.test(document.cookie)) location.replace('perfil.html');

const formAcceso = document.getElementById('formAcceso');
const estadoAcceso = document.getElementById('estadoAcceso');
const campoClave = document.getElementById('a-password');

document.getElementById('verClave').addEventListener('click', (e) => {
  const ver = campoClave.type === 'password';
  campoClave.type = ver ? 'text' : 'password';
  e.currentTarget.textContent = ver ? 'Ocultar' : 'Ver';
});

formAcceso.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = formAcceso.querySelector('button[type="submit"]');
  const datos = Object.fromEntries(new FormData(formAcceso));
  if (!datos.email || !datos.password) {
    estadoAcceso.textContent = 'Ingresa tu correo y contraseña.';
    return;
  }
  boton.disabled = true;
  estadoAcceso.textContent = 'Verificando…';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo iniciar sesión');
    location.href = 'perfil.html';
  } catch (err) {
    estadoAcceso.textContent = err.message;
    boton.disabled = false;
  }
});
