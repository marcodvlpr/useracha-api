import { db } from '@/db/database';
import {
  expensesTable,
  expensesPayersTable,
  expensesSplitsTable,
} from '@/db/schemas/expenses';
import { groupMembersTable, groupsTable } from '@/db/schemas/groups';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const createExpensesRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:groupId',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Create Expense',
        tags: ['Expenses'],
        params: z.object({
          groupId: z.uuid(),
        }),
        body: z.object({
          description: z.string().min(2).max(255),
          amount: z.number().positive(),
          date: z.coerce.date(),
          payers: z
            .array(
              z.object({
                userId: z.uuid(),
                amount: z.number().positive(),
              }),
            )
            .min(1),
          splits: z
            .array(
              z.object({
                userId: z.uuid(),
                amount: z.number().positive(),
              }),
            )
            .min(1),
        }),
        response: {
          201: z.object({
            id: z.string(),
            groupId: z.string(),
            description: z.string(),
            amount: z.string(),
            date: z.date(),
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
          404: z.object({
            message: z.literal('Group not found'),
            error: z.literal('GROUP_NOT_FOUND'),
          }),
        },
      },
    },
    async (request, reply) => {
      const { description, amount, date, payers, splits } = request.body;

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

      const totalPayers = payers.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPayers - amount) > 0.01) {
        return reply.status(400).send({
          message: 'Total amount paid by payers must equal the expense amount',
          error: 'INVALID_PAYERS_AMOUNT',
        });
      }

      const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplits - amount) > 0.01) {
        return reply.status(400).send({
          message:
            'Total amount split among users must equal the expense amount',
          error: 'INVALID_SPLITS_AMOUNT',
        });
      }

      const [expense] = await db.transaction(async (tx) => {
        const [expense] = await tx
          .insert(expensesTable)
          .values({
            groupId: request.params.groupId,
            description,
            amount: amount.toString(),
            date: new Date(date),
          })
          .returning();
        console.log('payers:', payers);
        console.log('expense.id:', expense.id);
        await tx.insert(expensesPayersTable).values(
          payers.map((p) => ({
            expenseId: expense.id,
            userId: p.userId,
            amount: p.amount.toString(),
          })),
        );

        await tx.insert(expensesSplitsTable).values(
          splits.map((s) => ({
            expenseId: expense.id,
            userId: s.userId,
            amount: s.amount.toString(),
          })),
        );

        return [expense];
      });

      return reply.status(201).send(expense);
    },
  );
};
