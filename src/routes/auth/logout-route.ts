import { db } from '@/db/database';
import { refreshTokensTable } from '@/db/schemas/refresh-tokens';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const logoutRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/logout',
    {
      schema: {
        summary: 'Logout',
        description: 'Logout a user',
        tags: ['Authentication'],
        response: {
          200: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        await db
          .delete(refreshTokensTable)
          .where(eq(refreshTokensTable.token, refreshToken));
      }

      return reply
        .clearCookie('accessToken', { path: '/' })
        .clearCookie('refreshToken', { path: '/' })
        .status(200)
        .send({ message: 'Logged out successfully' });
    },
  );
};
