import { db } from '@/db/database';
import { usersTable } from '@/db/schemas/user-schema';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import bcrypt from 'bcryptjs';

import { refreshTokensTable } from '@/db/schemas/refresh-tokens';

export const loginRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    {
      schema: {
        summary: 'Login',
        description: 'Login a user with email and password',
        tags: ['Authentication'],
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
          404: z.object({
            error: z.literal('USER_NOT_FOUND'),
            message: z.literal('User with this email not found'),
          }),
          401: z.object({
            error: z.literal('INVALID_PASSWORD'),
            message: z.literal('Invalid credentials'),
          }),
        },
        body: z.object({
          email: z.email(),
          password: z.string().min(6),
        }),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const userExists = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (userExists.length <= 0) {
        return reply.status(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User with this email not found',
        });
      }

      const comparePassword = await bcrypt.compare(
        password,
        userExists[0].password,
      );

      if (!comparePassword) {
        return reply
          .status(401)
          .send({ message: 'Invalid credentials', error: 'INVALID_PASSWORD' });
      }

      const tokens = app.generateTokens({
        id: userExists[0].id,
        email: userExists[0].email,
      });

      await db.insert(refreshTokensTable).values({
        user_id: userExists[0].id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return reply.status(200).send(tokens);
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        summary: 'Refresh Token',
        description: 'Refresh the access token using a valid refresh token',
        tags: ['Authentication'],
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
          401: z.object({
            message: z.enum(['Invalid refresh token', 'Unauthorized']),
            error: z.enum(['INVALID_REFRESH_TOKEN', 'UNAUTHORIZED']),
          }),
        },
        body: z.object({
          refreshToken: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const [tokenStored] = await db
        .select()
        .from(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.token, refreshToken),
            gt(refreshTokensTable.expiresAt, new Date()),
          ),
        );

      if (!tokenStored) {
        return reply.status(401).send({
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN',
        });
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, tokenStored.user_id))
        .limit(1);

      if (!user) {
        return reply.status(401).send({
          message: 'Unauthorized',
          error: 'UNAUTHORIZED',
        });
      }

      await db
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.id, tokenStored.id));

      const tokens = app.generateTokens({ id: user.id, email: user.email });

      await db.insert(refreshTokensTable).values({
        user_id: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return reply.status(200).send(tokens);
    },
  );
};
