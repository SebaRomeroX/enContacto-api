# enContacto API

API de enContacto: backend Express + MongoDB para una app de mensajería con salas, usuarios y autenticación JWT.

## Requisitos

- Node.js 22+
- pnpm

## Configuración local

```bash
pnpm install
cp .env.example .env   # configurar MONGO_DB_URI y TOKEN_KEY
pnpm dev               # o pnpm start
```

`pnpm dev` (nodemon) y `pnpm start` levantan el servidor en `http://localhost:3001` (o `$PORT` si está definido). En Vercel la app se importa sin abrir puerto.

## Endpoints

Auth: header `Authorization: Bearer <token>` (expiración 24 h). Los GET quedaron públicos a propósito por ahora.

### Login

| Método | Ruta         | Auth | Body               | Descripción                                                     |
| ------ | ------------ | ---- | ------------------ | --------------------------------------------------------------- |
| POST   | `/api/login` | no   | `nombre`, `contra` | Devuelve `{ nombre, token }`. Rate limit: 10 intentos / 15 min. |

### Usuarios

| Método | Ruta                | Auth   | Body                                | Descripción                                |
| ------ | ------------------- | ------ | ----------------------------------- | ------------------------------------------ |
| GET    | `/api/usuarios`     | no     | —                                   | Lista usuarios (no expone `contra`).       |
| POST   | `/api/usuarios`     | Bearer | `foto`, `nombre`_, `contra`_, `rol` | Crea usuario (contra hasheada con bcrypt). |
| DELETE | `/api/usuarios/:id` | Bearer | —                                   | Elimina usuario.                           |

### Salas

| Método | Ruta             | Auth   | Body      | Descripción   |
| ------ | ---------------- | ------ | --------- | ------------- |
| GET    | `/api/salas`     | no     | —         | Lista salas.  |
| POST   | `/api/salas`     | Bearer | `nombre`* | Crea sala.    |
| DELETE | `/api/salas/:id` | Bearer | —         | Elimina sala. |

### Mensajes

| Método | Ruta                | Auth   | Body                                | Descripción                           |
| ------ | ------------------- | ------ | ----------------------------------- | ------------------------------------- |
| GET    | `/api/mensajes`     | no     | —                                   | Lista mensajes.                       |
| POST   | `/api/mensajes`     | Bearer | `mensaje`_, `usuarioId`_, `salaId`* | Crea mensaje (`date` se asigna solo). |
| DELETE | `/api/mensajes/:id` | Bearer | —                                   | Elimina mensaje.                      |

\* obligatorio.

## Errores

Respuestas JSON con `{ error, detalles? }`:

- `400` — solicitud inválida (validación de campos, id inválido, JSON malformado)
- `401` — token o credenciales inválidos
- `429` — demasiados intentos (rate limit de login)
- `500` — error interno del servidor

## Tests

```bash
pnpm test
```

Usa el runner nativo de Node (`node:test`), 25 tests, sin dependencias extra.

## Deploy en Vercel

`vercel.json` está configurado (`builds` con `@vercel/node` y rutas). No hay paso de build: la app exporta `app` y Vercel instala con pnpm automáticamente (detectado por `pnpm-lock.yaml`, `--frozen-lockfile`).

## Probar con REST Client

La carpeta `requests/` contiene archivos `.rest` por recurso (`usuarios`, `salas`, `mensajes`) para probar los endpoints desde VS Code.
