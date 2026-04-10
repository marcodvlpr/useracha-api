import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { and, count, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const getGroupsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Get Group From a User',
        tags: ['Groups'],
        response: {
          201: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              ownerId: z.string(),
              memberCount: z.number(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const { id, name, description, createdAt, ownerId } = groupsTable;
      const groups = await db
        .select({
          id,
          name,
          description,
          createdAt,
          ownerId,
          memberCount: db.$count(
            groupMembersTable,
            eq(groupMembersTable.groupId, groupsTable.id),
          ),
        })
        .from(groupMembersTable)
        .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
        .where(eq(groupMembersTable.userId, request.user.id));

      return reply.send(groups);
    },
  );
};
