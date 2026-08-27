import { z } from "zod";
const environment = z.object({ PORT: z.coerce.number().int().positive().default(4000), CORS_ORIGIN: z.string().url().default("http://localhost:3000"), OPENROUTER_API_KEY: z.string().min(1), OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"), MEMWAL_PRIVATE_KEY: z.string().min(1), MEMWAL_ACCOUNT_ID: z.string().min(1), MEMWAL_SERVER_URL: z.string().url().default("https://relayer.memory.walrus.xyz") });
export const config = environment.parse(process.env);
