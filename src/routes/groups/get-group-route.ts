import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const getGroupRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:groupId',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Get Group Information',
        tags: ['Groups'],
        params: z.object({
          groupId: z.uuid(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            ownerId: z.string(),
            createdAt: z.date(),
            members: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
              }),
            ),
          }),
          404: z.object({
            message: z.literal('Group not found'),
            error: z.literal('GROUP_NOT_FOUND'),
          }),
          403: z.object({
            message: z.literal('You are not a member of this group'),
            error: z.literal('FORBIDDEN'),
          }),
        },
      },
    },
    async (request, reply) => {
      const [group] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, request.params.groupId))
        .limit(1);

      if (!group) {
        return reply.status(404).send({
          message: 'Group not found',
          error: 'GROUP_NOT_FOUND',
        });
      }

      const [isMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, request.params.groupId),
            eq(groupMembersTable.userId, request.user.id),
          ),
        )
        .limit(1);

      if (!isMember) {
        return reply.status(403).send({
          message: 'You are not a member of this group',
          error: 'FORBIDDEN',
        });
      }

      const members = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
        })
        .from(groupMembersTable)
        .innerJoin(usersTable, eq(usersTable.id, groupMembersTable.userId))
        .where(eq(groupMembersTable.groupId, request.params.groupId));

      return reply.send({ ...group, members });
    },
  );
};
