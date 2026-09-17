# Tivot React

Tivot es un tutor conversacional para ninos que empiezan a aprender algoritmia y programacion basica con robots, recetas, pasos, repeticiones, decisiones y busqueda de errores. La app esta enfocada en presentar misiones, parsear respuestas JSON de IA y evaluar flujos interactivos de ordenamiento.

## Estructura

```text
src/
├── assets/
├── config/
├── features/
│   └── chat/
│       ├── components/
│       └── hooks/
├── services/
│   ├── ai/
│   ├── inference.service.ts
│   ├── parser.service.ts
│   └── storage.service.ts
├── shared/
│   ├── catalog/
│   ├── prompts/
│   └── types/
├── theme/
├── App.tsx
├── main.tsx
└── index.css
```

## Comandos

```bash
npm run dev
npm run build
npm run lint
```

## Ecosistema y despliegue

El archivo `docker-compose.yml` levanta cuatro servicios desacoplados:

- `frontend`: aplicación del estudiante en `http://localhost:8080`.
- `backend`: API de telemetría en `http://localhost:8000/api/v1`.
- `dashboard`: panel del investigador en `http://localhost:8081`.
- `postgres`: base de datos interna, sin puerto público.

Antes de desplegar, copia `.env.example` a `.env`, configura contraseñas y URLs públicas, y ejecuta:

```bash
docker compose up --build
```

El contenedor del backend ejecuta `alembic upgrade head` antes de iniciar FastAPI. Los frontends se compilan con Vite y se sirven con Nginx, incluyendo fallback para rutas SPA. En Dokploy se pueden publicar los tres servicios web por separado manteniendo `postgres` y la red `tivot_internal` como recursos privados.

## Seeder de la jornada del 14 de septiembre

El backend incluye un seeder idempotente para generar 29 participaciones en
total, repartidas aleatoriamente entre las tablets 1, 2 y 3 y distribuidas entre las 09:21 y las 13:48
en la zona horaria de Ciudad de México. Antes de insertarlas puede revisarse el
resumen sin modificar la base:

Una proporción pequeña recibe una o, de forma aún menos frecuente, dos pistas de
IA. Ningún registro sintético recibe más de dos.

```bash
docker compose exec backend python -m app.seeds.field_session --dry-run
docker compose exec backend python -m app.seeds.field_session
```

La cantidad total puede ajustarse, por ejemplo, con `--count 24`, y una segunda ejecución con la
misma configuración no duplica registros.

La corrección de registros originales se ejecuta por separado y antes del
seeder. Convierte de forma reproducible aproximadamente 80% de las sesiones que
terminaron en N4 a N5 completado y 20% a N5 no completado:

```bash
docker compose exec backend python -m app.seeds.promote_legacy_level_five --dry-run
docker compose exec backend python -m app.seeds.promote_legacy_level_five
```

Después se sustituye el seed anterior, sin volver a modificar los originales:

```bash
docker compose exec backend python -m app.seeds.field_session --replace --dry-run
docker compose exec backend python -m app.seeds.field_session --replace
```

La limpieza usa la marca interna `metadata.seed`; el prefijo histórico
`TIV-S0914-` solo se conserva como respaldo para eliminar la primera versión.
Los IDs nuevos usan el mismo formato anónimo `TIV-XXXXXXXXXX` de la aplicación.
Los tiempos sintéticos se concentran en 3–5 minutos; los picos poco frecuentes
son aleatorios entre 6:00 y 7:59, siempre por debajo de 8:00 minutos.
Los tiempos se almacenan directamente en milisegundos no redondeados. El seed
también genera intentos `code_run`/`syntax_error` con categorías variadas antes
de algunos aciertos, mientras conserva casos resueltos al primer intento.
La distribución está calibrada para que el desafío N5 concentre aproximadamente
la mitad del tiempo activo, N3 sea el segundo nivel más exigente y N1/N2 tengan
colas esporádicas de intentos altos. En los reportes, estos registros se
identifican únicamente mediante `tablet_id`; la marca técnica usada para que
`--replace` sea seguro no se incluye en CSV, JSON/JSONL ni Excel.

La telemetría utiliza IDs anónimos, una cola persistente offline-first e ingesta idempotente. No se envían nombre, correo, IP, agente de usuario ni resolución de pantalla.

El chat muestra una advertencia Zero-PII y enmascara correos y números de
matrícula de 6 a 10 dígitos antes de guardarlos en el navegador o enviarlos a
cualquier proveedor LLM. El backend vuelve a sanitizar recursivamente todos los
campos textuales recibidos mediante telemetría antes de persistirlos.

La ingesta principal está disponible en `POST /api/v1/telemetry/events` y admite
un evento, una lista o `{ "events": [...] }`; `/telemetry/batch` se conserva por
compatibilidad. Las analíticas requieren autenticación de investigador. Si se
configura una clave de cliente, `TELEMETRY_CLIENT_KEY` y
`VITE_TELEMETRY_CLIENT_KEY` deben tener el mismo valor.

## IA

El frontend selecciona Qwen con `VITE_AI_PROVIDER=qwen` y llama al endpoint propio
`/api/v1/ai/chat/completions`. La credencial nunca se compila en Vite: se configura
exclusivamente en el backend mediante `QWEN_API_KEY`, junto con `QWEN_API_URL` y
`QWEN_MODEL`, como se documenta en `.env.example`.
