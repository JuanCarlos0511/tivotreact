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

El backend incluye un seeder idempotente para generar 15, 18 y 11 participaciones
en las tablets 1, 2 y 3 respectivamente (44 en total), distribuidas entre las 09:21 y las 13:48
en la zona horaria de Ciudad de México. Antes de insertarlas puede revisarse el
resumen sin modificar la base:

Una proporción pequeña recibe una o, de forma aún menos frecuente, dos pistas de
IA. Ningún registro sintético recibe más de dos.

```bash
docker compose exec backend python -m app.seeds.field_session --dry-run
docker compose exec backend python -m app.seeds.field_session
```

Las cantidades pueden ajustarse, por ejemplo, con `--tablet-counts 12,16,14`, y una segunda ejecución con la
misma configuración no duplica registros.

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
