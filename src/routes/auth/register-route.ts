import { db } from '@/db/database';
import { usersTable } from '@/db/schemas/user-schema';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import bcrypt from 'bcryptjs';
import { refreshTokensTable } from '@/db/schemas/refresh-tokens';
import { setAuthCookies } from '@/utils/set-auth-cookies';

export const registerRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/register',
    {
      schema: {
        summary: 'Register',
        description: 'Register a new user with email and password',
        tags: ['Authentication'],
        response: {
          201: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
          409: z.object({
            message: z.literal('User with this email already exists'),
            error: z.literal('USER_ALREADY_EXISTS'),
          }),
        },
        body: z.object({
          name: z.string().min(2),
          email: z.email(),
          password: z.string().min(6),
        }),
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;

      const [userExists] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (userExists) {
        return reply.status(409).send({
          error: 'USER_ALREADY_EXISTS',
          message: 'User with this email already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [userCreated] = await db
        .insert(usersTable)
        .values({
          name,
          email,
          password: hashedPassword,
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        });

      const tokens = app.generateTokens({
        id: userCreated.id,
        email: userCreated.email,
      });

      await db.insert(refreshTokensTable).values({
        user_id: userCreated.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return setAuthCookies(reply, tokens).status(201).send(tokens);
    },
  );
};
