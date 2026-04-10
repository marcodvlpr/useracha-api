import { db } from '@/db/database';
import { usersTable } from '@/db/schemas/user-schema';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { REPL_MODE_SLOPPY } from 'node:repl';

export const meRoute: FastifyPluginAsyncZod = async (app) => {
  app.get('/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const [user] = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, request.user.id))
      .limit(1);

    return reply.send(user);
  });
};
