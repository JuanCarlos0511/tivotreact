# Tivot React

Tivot es un tutor conversacional para razonar sobre algoritmia, arquitectura y logica de sistemas POS. La app esta enfocada en presentar problemas, parsear respuestas JSON de IA y evaluar flujos interactivos de ordenamiento.

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
