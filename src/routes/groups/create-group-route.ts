import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const createGroupRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Create Group',
        tags: ['Groups'],
        body: z.object({
          name: z.string().min(2).max(100),
          description: z.string().max(255).optional(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            ownerId: z.string(),
            createdAt: z.date(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, description } = request.body;

      const [group] = await db
        .insert(groupsTable)
        .values({
          name,
          description,
          ownerId: request.user.id,
        })
        .returning();

      await db.insert(groupMembersTable).values({
        groupId: group.id,
        userId: request.user.id,
      });

      return reply.status(201).send(group);
    },
  );
};
