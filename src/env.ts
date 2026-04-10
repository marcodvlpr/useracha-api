import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3333),
  RESEND_API_KEY: z.string(),
  COOKIE_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
