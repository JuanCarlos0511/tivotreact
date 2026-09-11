FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_TELEMETRY_API_URL
ARG VITE_RESEARCH_CONDITION=standard
ARG VITE_AI_PROVIDER=qwen
ARG VITE_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
ARG VITE_AI_MODEL_NAME=gemini-1.5-flash
ARG VITE_AI_TIMEOUT_MS=15000
ARG VITE_AI_TEMPERATURE=0.4
ARG VITE_QWEN_API_KEY
ARG VITE_QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
ARG VITE_QWEN_MODEL=qwen-plus
ARG VITE_TELEMETRY_CLIENT_KEY
ARG VITE_APP_ENV=production
ENV VITE_TELEMETRY_API_URL=$VITE_TELEMETRY_API_URL \
    VITE_RESEARCH_CONDITION=$VITE_RESEARCH_CONDITION \
    VITE_AI_PROVIDER=$VITE_AI_PROVIDER \
    VITE_AI_BASE_URL=$VITE_AI_BASE_URL \
    VITE_AI_MODEL_NAME=$VITE_AI_MODEL_NAME \
    VITE_AI_TIMEOUT_MS=$VITE_AI_TIMEOUT_MS \
    VITE_AI_TEMPERATURE=$VITE_AI_TEMPERATURE \
    VITE_QWEN_API_KEY=$VITE_QWEN_API_KEY \
    VITE_QWEN_BASE_URL=$VITE_QWEN_BASE_URL \
    VITE_QWEN_MODEL=$VITE_QWEN_MODEL \
    VITE_TELEMETRY_CLIENT_KEY=$VITE_TELEMETRY_CLIENT_KEY \
    VITE_APP_ENV=$VITE_APP_ENV
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
