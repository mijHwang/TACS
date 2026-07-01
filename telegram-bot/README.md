# Bot de Telegram — TACS

Cliente REST del backend. No implementa lógica de negocio; consume la API existente.

## Variables de entorno
- `TELEGRAM_BOT_TOKEN` — token de @BotFather (obligatorio).
- `BACKEND_URL` — URL del backend (default `http://localhost:8080`; en docker `http://backend:8080`).

## Correr con Docker (recomendado)
Con `TELEGRAM_BOT_TOKEN` en el `.env` de la raíz del repo:
```bash
docker compose up --build telegram-bot
```

## Correr local (dev)
```bash
cd telegram-bot
cp ../.env.example .env   # y completar TELEGRAM_BOT_TOKEN y BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Comandos del bot
- `/start`, `/login`, `/logout`, `/whoami` (Fase 1)
- `/buscar`, `/miscoleccion`, `/faltantes`, `/repetidas`, `/notificaciones`, `/publicar` (Fase 2)
