// routes/groups/expenses/get-balances-route.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@/db/database';
import {
  expensesTable,
  expensesPayersTable,
  expensesSplitsTable,
  paymentsTable,
} from '@/db/schemas/expenses';
import { groupMembersTable } from '@/db/schemas/groups';
import { usersTable } from '@/db/schemas/user-schema';
import { eq, and, inArray } from 'drizzle-orm';

export const getBalancesRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:groupId/balances',
    {
      onRequest: [app.authenticate],
      schema: {
        summary: 'Get Balances',
        description: 'Get balances of a group',
        tags: ['Expenses'],
        params: z.object({
          groupId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            balances: z.array(
              z.object({
                userId: z.string(),
                name: z.string(),
                balance: z.number(),
              }),
            ),
            settlements: z.array(
              z.object({
                from: z.object({ id: z.string(), name: z.string() }),
                to: z.object({ id: z.string(), name: z.string() }),
                amount: z.number(),
              }),
            ),
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

      // busca todos os membros do grupo
      const members = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(groupMembersTable)
        .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
        .where(eq(groupMembersTable.groupId, groupId));

      // busca todas as despesas do grupo
      const expenses = await db
        .select()
        .from(expensesTable)
        .where(eq(expensesTable.groupId, groupId));

      const expenseIds = expenses.map((e) => e.id);

      if (expenseIds.length === 0) {
        return reply.send({
          balances: members.map((m) => ({
            userId: m.id,
            name: m.name,
            balance: 0,
          })),
          settlements: [],
        });
      }

      // busca todos os payers e splits das despesas do grupo
      const payers = await db
        .select()
        .from(expensesPayersTable)
        .where(inArray(expensesPayersTable.expenseId, expenseIds));

      const splits = await db
        .select()
        .from(expensesSplitsTable)
        .where(inArray(expensesSplitsTable.expenseId, expenseIds));

      // calcula saldo de cada membro
      const balanceMap = new Map<string, number>();

      for (const member of members) {
        balanceMap.set(member.id, 0);
      }

      for (const payer of payers) {
        const current = balanceMap.get(payer.userId) ?? 0;
        balanceMap.set(payer.userId, current + Number(payer.amount));
      }

      for (const split of splits) {
        const current = balanceMap.get(split.userId) ?? 0;
        balanceMap.set(split.userId, current - Number(split.amount));
      }

      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.groupId, groupId));

      for (const payment of payments) {
        const from = balanceMap.get(payment.fromUserId) ?? 0;
        balanceMap.set(payment.fromUserId, from - Number(payment.amount));

        const to = balanceMap.get(payment.toUserId) ?? 0;
        balanceMap.set(payment.toUserId, to + Number(payment.amount));
      }

      const balances = members.map((m) => ({
        userId: m.id,
        name: m.name,
        balance: Math.round((balanceMap.get(m.id) ?? 0) * 100) / 100,
      }));

      // algoritmo de simplificação de dívidas
      const creditors = balances
        .filter((b) => b.balance > 0)
        .map((b) => ({ ...b }));

      const debtors = balances
        .filter((b) => b.balance < 0)
        .map((b) => ({ ...b }));

      const settlements: {
        from: { id: string; name: string };
        to: { id: string; name: string };
        amount: number;
      }[] = [];

      let i = 0;
      let j = 0;

      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
        const rounded = Math.round(amount * 100) / 100;

        if (rounded > 0) {
          settlements.push({
            from: { id: debtor.userId, name: debtor.name },
            to: { id: creditor.userId, name: creditor.name },
            amount: rounded,
          });
        }

        debtor.balance += amount;
        creditor.balance -= amount;

        if (Math.abs(debtor.balance) < 0.01) i++;
        if (Math.abs(creditor.balance) < 0.01) j++;
      }

      return reply.send({ balances, settlements });
    },
  );
};
