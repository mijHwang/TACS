export interface Config {
  botToken: string;
  backendUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Falta la variable de entorno TELEGRAM_BOT_TOKEN.");
  }
  return {
    botToken,
    backendUrl: env.BACKEND_URL ?? "http://localhost:8080",
  };
}
