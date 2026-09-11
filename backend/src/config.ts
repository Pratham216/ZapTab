import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export type ParserMode = "local" | "vision" | "openrouter";
export type VisionProvider = "openrouter" | "nvidia";

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/zaptab",
  tesseractPath:
    process.env.TESSERACT_PATH ??
    "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
  parserMode: (process.env.PARSER_MODE ?? "vision") as ParserMode,
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openrouter/free",
  openRouterVisionModel:
    process.env.OPENROUTER_VISION_MODEL ?? "openai/gpt-4o-mini",
  openRouterMaxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS ?? "2048", 10),
  visionProvider: (process.env.VISION_PROVIDER ?? "openrouter") as VisionProvider,
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
  nvidiaVisionModel:
    process.env.NVIDIA_VISION_MODEL ??
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  tempDir: process.env.TEMP_DIR ?? "temp/uploads",
  ocrDebugDir: process.env.OCR_DEBUG_DIR ?? "temp/ocr-debug",
  tempFileTtlMs: parseInt(process.env.TEMP_FILE_TTL_MS ?? "1800000", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  appUrl: process.env.APP_URL ?? "",
  lanIp: process.env.LAN_IP ?? "",
  frontendPort: parseInt(process.env.FRONTEND_PORT ?? "5173", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  roomExpiryMs: parseInt(process.env.ROOM_EXPIRY_HOURS ?? "24", 10) * 60 * 60 * 1000,
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
};

export function isVisionConfigured(): boolean {
  if (config.visionProvider === "nvidia") {
    return !!config.nvidiaApiKey;
  }
  return !!config.openRouterApiKey;
}

export function getActiveVisionModel(): string {
  if (config.visionProvider === "nvidia") {
    return process.env.NVIDIA_VISION_MODEL?.trim() || config.nvidiaVisionModel;
  }
  return (
    process.env.OPENROUTER_VISION_MODEL?.trim() || config.openRouterVisionModel
  );
}

export function getModelTag(): string {
  const model = getActiveVisionModel();
  if (model.includes("/")) {
    return model;
  }
  return `${config.visionProvider}/${model}`;
}
