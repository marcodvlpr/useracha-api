import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const removeMemberRoute: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    '/:groupId/members',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Remove Member from Group',
        tags: ['Groups'],
        params: z.object({
          groupId: z.uuid(),
        }),
        body: z.object({
          email: z.email(),
        }),
        response: {
          200: z.object({
            id: z.string(),
          }),
          404: z.union([
            z.object({
              message: z.literal('Group not found'),
              error: z.literal('GROUP_NOT_FOUND'),
            }),
            z.object({
              message: z.literal('User not found'),
              error: z.literal('USER_NOT_FOUND'),
            }),
            z.object({
              message: z.literal('User is not a member of this group'),
              error: z.literal('NOT_MEMBER'),
            }),
          ]),
          403: z.union([
            z.object({
              message: z.literal('Only the group owner can remove members'),
              error: z.literal('FORBIDDEN'),
            }),
            z.object({
              message: z.literal(
                'Group owner cannot be removed from the group',
              ),
              error: z.literal('FORBIDDEN'),
            }),
          ]),
        },
      },
    },
    async (request, reply) => {
      const { groupId } = request.params;
      const { email } = request.body;

      const [group] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, groupId))
        .limit(1);

      if (!group) {
        return reply
          .status(404)
          .send({ message: 'Group not found', error: 'GROUP_NOT_FOUND' });
      }

      if (group.ownerId !== request.user.id) {
        return reply.status(403).send({
          message: 'Only the group owner can remove members',
          error: 'FORBIDDEN',
        });
      }

      const [userToRemove] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (!userToRemove) {
        return reply.status(404).send({
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
      }

      if (group.ownerId === userToRemove.id) {
        return reply.status(403).send({
          message: 'Group owner cannot be removed from the group',
          error: 'FORBIDDEN',
        });
      }

      const [isMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userToRemove.id),
          ),
        );

      if (!isMember) {
        return reply.status(404).send({
          message: 'User is not a member of this group',
          error: 'NOT_MEMBER',
        });
      }

      const [member] = await db
        .delete(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userToRemove.id),
          ),
        )
        .returning();

      return reply.status(200).send(member);
    },
  );
};
