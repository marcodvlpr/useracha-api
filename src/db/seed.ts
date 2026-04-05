import { env } from '@/env';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { usersTable } from './schemas/user-schema';
import { faker } from '@faker-js/faker';
import postgres from 'postgres';

const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle({ client, casing: 'snake_case' });

async function seedDatabase() {
  await db.delete(usersTable);
  const users = Array.from({ length: 10 }).map(() => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  }));

  await db.insert(usersTable).values(users);
  await client.end();
  console.log(`☘  Seeded database with ${users.length} fake users`);
}

seedDatabase().catch((e) => console.error(e));
