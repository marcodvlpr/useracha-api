import { env } from '@/env';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { usersTable } from './schemas/user-schema';
import { faker } from '@faker-js/faker';
import postgres from 'postgres';
const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle({ client, casing: 'snake_case' });
