# VIMOD – Página de presentación

Sitio de presentación de **VIMOD · Arquitectura y Diseño** con video de inicio, secciones Nosotros, Proyectos, Softwares y Contacto, y una página de **planes** (Estándar, Premium, Enterprise) para el software VIMOD Gestión.

- **Frontend:** HTML, CSS y JS en `public/`
- **Backend:** Node.js + Express (`server.js`)
- **Base de datos:** MongoDB (Mongoose) – guarda mensajes de contacto y solicitudes de planes

## Estructura

```
public/
  index.html        Inicio (video + secciones)
  planes.html       Nuestros planes
  css/styles.css    Estilos (paleta negro/blanco del logo)
  js/main.js        Navegación, animaciones, formulario de contacto
  js/planes.js      Carga de planes y formulario de solicitud
  img/              Logo
  video/            Video de portada (VIMOD_intro_v3_1080p.mp4)
data/planes.js      Precios y características de los planes
models/             Esquemas de MongoDB
server.js           Servidor Express + API
render.yaml         Configuración para Render
```

## Ejecutar en local

```bash
npm install
cp .env.example .env     # y coloca tu MONGODB_URI
npm run dev
```

Abre http://localhost:3000

## Video de portada

El video está en `public/video/VIMOD_intro_v3_1080p.mp4`. Para cambiarlo, reemplaza el archivo
(o edita la ruta en `public/index.html`). Recomendado: MP4 H.264, 1280×720 o 1920×1080, menos de 15 MB.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Página de presentación VIMOD"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vimod-presentacion.git
git push -u origin main
```

## MongoDB Atlas

1. Crea un cluster gratuito en https://www.mongodb.com/atlas
2. *Database Access* → crea un usuario y contraseña.
3. *Network Access* → agrega `0.0.0.0/0` (necesario para Render).
4. *Connect → Drivers* → copia la cadena `mongodb+srv://...` y añade `/vimod` antes del `?`.

## Desplegar en Render

1. En https://render.com → **New → Blueprint** y elige tu repositorio (usa `render.yaml`).
   O bien **New → Web Service**: Build `npm install`, Start `npm start`.
2. En *Environment* agrega `MONGODB_URI` con tu cadena de Atlas.
3. Comprueba en `https://TU-APP.onrender.com/api/health` que la base diga `conectada`.

## API

| Método | Ruta              | Descripción                          |
|--------|-------------------|--------------------------------------|
| GET    | /api/health       | Estado del servidor y la base        |
| GET    | /api/planes       | Lista de planes                      |
| POST   | /api/contacto     | `{ nombre, email, mensaje }`         |
| POST   | /api/solicitudes  | `{ plan, nombre, empresa, email, telefono }` |

Los registros se guardan en las colecciones `contactos` y `solicituds` de MongoDB.

## Área de clientes (Acceder → Mi cuenta)

El menú tiene **Acceder**: el cliente inicia sesión en `acceder.html` y ve en `perfil.html` sus sistemas,
licencias (con clave y vencimiento), solicitudes y sus datos (puede editarlos y cambiar su contraseña).

Las cuentas, licencias y sistemas se crean desde el **Panel administrador** (repositorio aparte),
que debe usar **la misma** `MONGODB_URI`. Variables adicionales:

| Variable         | Descripción                                             |
|------------------|---------------------------------------------------------|
| `SESSION_SECRET` | Texto largo y aleatorio para firmar las sesiones        |

| Método | Ruta                    | Descripción                              |
|--------|-------------------------|------------------------------------------|
| POST   | /api/auth/registro      | `{ nombre, email, empresa, telefono, password }` (crea la cuenta) |
| POST   | /api/auth/login         | `{ email, password }`                    |
| POST   | /api/auth/logout        | Cierra la sesión                         |
| GET    | /api/cuenta             | Datos del cliente                        |
| PUT    | /api/cuenta             | `{ nombre, empresa, telefono }`          |
| PUT    | /api/cuenta/password    | `{ actual, nueva }`                      |
| GET    | /api/cuenta/licencias   | Licencias y sistemas del cliente         |
| GET    | /api/cuenta/solicitudes | Solicitudes enviadas con su correo       |
