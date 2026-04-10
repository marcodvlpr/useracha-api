import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@/db/database';
import {
  expensesTable,
  expensesPayersTable,
  expensesSplitsTable,
} from '@/db/schemas/expenses';
import { groupMembersTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { eq, and } from 'drizzle-orm';

export const getExpensesRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:groupId',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Get Expenses',
        description: 'Get all expenses of a group',
        tags: ['Expenses'],
        params: z.object({
          groupId: z.string().uuid(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              description: z.string(),
              amount: z.string(),
              date: z.date(),
              createdAt: z.date(),
              payers: z.array(
                z.object({
                  userId: z.string(),
                  name: z.string(),
                  amount: z.string(),
                }),
              ),
              splits: z.array(
                z.object({
                  userId: z.string(),
                  name: z.string(),
                  amount: z.string(),
                }),
              ),
            }),
          ),
          403: z.object({
            message: z.literal('You are not a member of this group'),
            error: z.literal('FORBIDDEN'),
          }),
        },
      },
    },
    async (request, reply) => {
      const { groupId } = request.params;

      const [isMember] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
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

      const expenses = await db
        .select()
        .from(expensesTable)
        .where(eq(expensesTable.groupId, groupId));

      const expensesWithDetails = await Promise.all(
        expenses.map(async (expense) => {
          const payers = await db
            .select({
              userId: usersTable.id,
              name: usersTable.name,
              amount: expensesPayersTable.amount,
            })
            .from(expensesPayersTable)
            .innerJoin(
              usersTable,
              eq(expensesPayersTable.userId, usersTable.id),
            )
            .where(eq(expensesPayersTable.expenseId, expense.id));

          const splits = await db
            .select({
              userId: usersTable.id,
              name: usersTable.name,
              amount: expensesSplitsTable.amount,
            })
            .from(expensesSplitsTable)
            .innerJoin(
              usersTable,
              eq(expensesSplitsTable.userId, usersTable.id),
            )
            .where(eq(expensesSplitsTable.expenseId, expense.id));

          return { ...expense, payers, splits };
        }),
      );

      return reply.send(expensesWithDetails);
    },
  );
};
