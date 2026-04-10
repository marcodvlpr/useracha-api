import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@/db/database';
import { paymentsTable } from '@/db/schemas/expenses';
import { groupMembersTable } from '@/db/schemas/groups';
import { eq, and } from 'drizzle-orm';

export const createPaymentRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:groupId/payments',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Create Payment',
        description: 'Register a payment between two members',
        tags: ['Payments'],
        params: z.object({
          groupId: z.string().uuid(),
        }),
        body: z.object({
          toUserId: z.string().uuid(),
          amount: z.number().positive(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            groupId: z.string(),
            fromUserId: z.string(),
            toUserId: z.string(),
            amount: z.string(),
            createdAt: z.date(),
          }),
          400: z.object({
            message: z.string(),
            error: z.string(),
          }),
          403: z.object({
            message: z.literal('You are not a member of this group'),
            error: z.literal('FORBIDDEN'),
          }),
        },
      },
    },
    async (request, reply) => {
      const { groupId } = request.params;
      const { toUserId, amount } = request.body;
      const { id: fromUserId } = request.user;

      // verifica se o pagador é membro
      const [isMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, fromUserId),
          ),
        )
        .limit(1);

      if (!isMember) {
        return reply.status(403).send({
          message: 'You are not a member of this group',
          error: 'FORBIDDEN',
        });
      }

      // verifica se o recebedor é membro
      const [isToMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, toUserId),
          ),
        )
        .limit(1);

      if (!isToMember) {
        return reply.status(400).send({
          message: 'The recipient is not a member of this group',
          error: 'RECIPIENT_NOT_MEMBER',
        });
      }

      // impede pagar para si mesmo
      if (fromUserId === toUserId) {
        return reply.status(400).send({
          message: 'You cannot pay yourself',
          error: 'INVALID_PAYMENT',
        });
      }

      const [payment] = await db
        .insert(paymentsTable)
        .values({
          groupId,
          fromUserId,
          toUserId,
          amount: amount.toString(),
        })
        .returning();

      return reply.status(201).send(payment);
    },
  );
};
