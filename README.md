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

`pnpm dev` (nodemon) y `pnpm start` levantan el servidor en `http://localhost:3001` (o `$PORT` si está definido). En Vercel la app se importa sin abrir puerto. Si faltan `TOKEN_KEY` o `MONGO_DB_URI`, la app **aborta al arrancar** con un mensaje claro (fail fast).

## Endpoints

Auth: header `Authorization: Bearer <token>` (expiración 24 h). Todos los endpoints (GET, POST y DELETE) requieren el token; sin él la API responde `401`.

### Roles

Hay tres roles (`admin`, `user`, `mod`). Solo puede existir una cuenta `admin` (no se puede crear ni eliminar), y **solo `admin` puede eliminar** salas, usuarios y mensajes. El token incluye el `rol`; si un usuario cambia de rol debe volver a loguearse (el rol queda fijado en el token por 24 h).

### Login

| Método | Ruta         | Auth | Body               | Descripción                                                     |
| ------ | ------------ | ---- | ------------------ | --------------------------------------------------------------- |
| POST   | `/api/login` | no   | `nombre`, `contra` | Devuelve `{ nombre, token }`. Rate limit: 10 intentos / 15 min. |

### Usuarios

| Método | Ruta                | Auth                | Body                                | Descripción                                                                                                              |
| ------ | ------------------- | ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/usuarios`     | Bearer              | —                                   | Lista usuarios (no expone `contra`).                                                                                     |
| GET    | `/api/usuarios/:id` | Bearer              | —                                   | Detalle de un usuario (no expone `contra`). `404` si no existe.                                                          |
| POST   | `/api/usuarios`     | Bearer              | `foto`, `nombre`_, `contra`_, `rol` | Crea usuario (contra hasheada mín. 6, nombre único). `rol` solo `user`/`mod`, default `user`; no se puede crear `admin`. |
| DELETE | `/api/usuarios/:id` | Bearer (solo admin) | —                                   | Elimina usuario (no al admin).                                                                                           |

### Salas

| Método | Ruta             | Auth                | Body      | Descripción                              |
| ------ | ---------------- | ------------------- | --------- | ---------------------------------------- |
| GET    | `/api/salas`     | Bearer              | —         | Lista salas.                             |
| GET    | `/api/salas/:id` | Bearer              | —         | Detalle de una sala. `404` si no existe. |
| POST   | `/api/salas`     | Bearer              | `nombre`* | Crea sala.                               |
| DELETE | `/api/salas/:id` | Bearer (solo admin) | —         | Elimina sala.                            |

### Mensajes

| Método | Ruta                | Auth                | Body                                | Descripción                                                                                                          |
| ------ | ------------------- | ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/mensajes`     | Bearer              | —                                   | Lista mensajes (más nuevos primero, paginado). Filtros: `salaId`, `desde`, `hasta`. Total en header `X-Total-Count`. |
| GET    | `/api/mensajes/:id` | Bearer              | —                                   | Detalle de un mensaje (con usuario y sala poblados). `404` si no existe.                                             |
| POST   | `/api/mensajes`     | Bearer              | `mensaje`_, `usuarioId`_, `salaId`* | Crea mensaje (`date` se asigna solo).                                                                                |
| DELETE | `/api/mensajes/:id` | Bearer (solo admin) | —                                   | Elimina mensaje.                                                                                                     |

### Paginación y filtros de mensajes

`GET /api/mensajes` acepta query params (todos opcionales):

| Parámetro | Descripción                                                             | Default |
| --------- | ----------------------------------------------------------------------- | ------- |
| `salaId`  | Filtra mensajes de una sala (id inválido → `400`).                      | —       |
| `desde`   | Solo mensajes con `date` >= fecha ISO (fecha inválida → `400`).         | —       |
| `hasta`   | Solo mensajes con `date` <= fecha ISO (fecha inválida → `400`).         | —       |
| `limit`   | Cantidad de mensajes por página (entero 1–100; fuera de rango → `400`). | `50`    |
| `offset`  | Desplazamiento para paginar (entero >= 0).                              | `0`     |

Los resultados vienen ordenados de **más nuevo a más antiguo** por `date`. El total de la consulta (sin paginar) se expone en el header `X-Total-Count`. Ejemplo: `GET /api/mensajes?salaId=<id>&desde=2026-01-01T00:00:00.000Z&limit=50&offset=0`.

Nota: al crear un mensaje, `usuarioId` y `salaId` deben ser ObjectIds válidos de un usuario y una sala existentes (si no, `400`). Los mensajes con `usuarioId` de un usuario **eliminado físicamente** se siguen mostrando: el populate no los resuelve y el campo queda como id sin resolver; el front lo muestra como "eliminado: mensaje". Al borrar una **sala** sus mensajes se borran en cascada (`DELETE /api/salas/:id`).

\* obligatorio.

## Rate limits

Límites en memoria por instancia (no compartidos entre instancias serverless):

| Endpoint             | Límite                        |
| -------------------- | ----------------------------- |
| `POST /api/login`    | 10 intentos / 15 min (por IP) |
| `POST /api/mensajes` | 30 / min (por usuario)        |
| `POST /api/salas`    | 10 / min (por usuario)        |
| `POST /api/usuarios` | 10 / min (por usuario)        |

Al exceder el límite, la API responde `429`.

## Errores

Respuestas JSON con `{ error, detalles? }`:

- `400` — solicitud inválida (validación de campos, nombre duplicado, id inválido, JSON malformado)
- `401` — token o credenciales inválidos
- `403` — sin permiso (rol insuficiente, p. ej. borrar sin ser admin o borrar la cuenta admin)
- `404` — recurso no encontrado
- `429` — demasiados intentos (rate limit de login)
- `500` — error interno del servidor

## Tests

```bash
pnpm test
```

Usa el runner nativo de Node (`node:test`), 71 tests, sin dependencias extra.

## Deploy en Vercel

`vercel.json` está configurado (`builds` con `@vercel/node` y rutas). No hay paso de build: la app exporta `app` y Vercel instala con pnpm automáticamente (detectado por `pnpm-lock.yaml`, `--frozen-lockfile`).

## Probar con REST Client

La carpeta `requests/` contiene archivos `.rest` por recurso (`usuarios`, `salas`, `mensajes`) para probar los endpoints desde VS Code.
