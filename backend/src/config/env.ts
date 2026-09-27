import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly corsOrigin: string;
  readonly githubToken?: string;
  readonly databaseUrl?: string;
  readonly aiProvider?: string;
  readonly aiApiKey?: string;
}

function parsePort(rawPort: string | undefined, defaultPort: number): number {
  if (!rawPort) {
    return defaultPort;
  }
  const parsed = parseInt(rawPort, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    console.warn(`[Config] Invalid PORT "${rawPort}" provided. Defaulting to ${defaultPort}.`);
    return defaultPort;
  }
  return parsed;
}

function parseNodeEnv(rawEnv: string | undefined): 'development' | 'production' | 'test' {
  if (rawEnv === 'production' || rawEnv === 'test') {
    return rawEnv;
  }
  return 'development';
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = parseNodeEnv(process.env['NODE_ENV']);
  const port = parsePort(process.env['PORT'], 4000);
  const corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:5173';
  const githubToken = process.env['GITHUB_TOKEN'] || undefined;
  const databaseUrl = process.env['DATABASE_URL'] || undefined;
  const aiProvider = process.env['AI_PROVIDER'] || undefined;
  const aiApiKey = process.env['AI_API_KEY'] || undefined;

  return {
    port,
    nodeEnv,
    corsOrigin,
    githubToken,
    databaseUrl,
    aiProvider,
    aiApiKey,
  };
}

export const env: EnvironmentConfig = loadEnvironmentConfig();
