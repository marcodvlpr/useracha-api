import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const deleteGroupRoute: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Delete Group',
        tags: ['Groups'],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            group: z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              ownerId: z.string(),
              createdAt: z.date(),
            }),
          }),
          404: z.object({
            message: z.literal('Group not found'),
            error: z.literal('GROUP_NOT_FOUND'),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [groupExists] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, id))
        .limit(1);
      if (!groupExists) {
        return reply.status(404).send({
          message: 'Group not found',
          error: 'GROUP_NOT_FOUND',
        });
      }

      const [group] = await db
        .delete(groupsTable)
        .where(eq(groupsTable.id, id))
        .returning();

      return reply
        .status(200)
        .send({ message: 'Group deleted successfully', group });
    },
  );
};
