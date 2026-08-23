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

## IA

El proveedor por defecto es `mock`. Ollama puede usarse localmente. Gemini y OpenAI solo se activan con una API key capturada en runtime desde el modal de configuracion, guardada en `localStorage`.
