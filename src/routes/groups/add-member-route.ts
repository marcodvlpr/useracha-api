import { db } from '@/db/database';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const addMemberRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:groupId/members',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Add Member to Group',
        tags: ['Groups'],
        params: z.object({
          groupId: z.uuid(),
        }),
        body: z.object({
          email: z.email(),
        }),
        response: {
          201: z.object({
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
          ]),
          403: z.object({
            message: z.literal('Only the group owner can add members'),
            error: z.literal('FORBIDDEN'),
          }),
          409: z.object({
            message: z.literal('User is already a member of this group'),
            error: z.literal('ALREADY_MEMBER'),
          }),
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
          message: 'Only the group owner can add members',
          error: 'FORBIDDEN',
        });
      }

      const [userToAdd] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (!userToAdd) {
        return reply.status(404).send({
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
      }

      const [alreadyMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userToAdd.id),
          ),
        );

      if (alreadyMember) {
        return reply.status(409).send({
          message: 'User is already a member of this group',
          error: 'ALREADY_MEMBER',
        });
      }

      const [member] = await db
        .insert(groupMembersTable)
        .values({
          groupId,
          userId: userToAdd.id,
        })
        .returning();

      return reply.status(201).send(member);
    },
  );
};
