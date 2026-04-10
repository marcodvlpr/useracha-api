import type { FastifyInstance } from 'fastify';
import { loginRoute } from './auth/login-route';
import { registerRoute } from './auth/register-route';
import { createExpensesRoute } from './expenses/create-expenses-route';
import { addMemberRoute } from './groups/add-member-route';
import { createGroupRoute } from './groups/create-group-route';
import { deleteGroupRoute } from './groups/delete-group-route';
import { getGroupRoute } from './groups/get-group-route';
import { getGroupsRoute } from './groups/get-groups-route';
import { removeMemberRoute } from './groups/remove-member-route';
import { meRoute } from './me-route';
import { getExpensesRoute } from './expenses/get-expenses-route';
import { getBalancesRoute } from './expenses/get-balances-route';
import { createPaymentRoute } from './payments/create-payment-route';
import { logoutRoute } from './auth/logout-route';

export const routes = async (app: FastifyInstance) => {
  app.register(
    async (instance) => {
      instance.register(registerRoute);
      instance.register(loginRoute);
      instance.register(logoutRoute);
    },
    { prefix: '/auth' },
  );

  app.register(
    async (instance) => {
      instance.register(createGroupRoute);
      instance.register(getGroupRoute);
      instance.register(getGroupsRoute);
      instance.register(deleteGroupRoute);
      instance.register(addMemberRoute);
      instance.register(removeMemberRoute);
    },
    { prefix: '/groups' },
  );

  app.register(
    async (instance) => {
      instance.register(createExpensesRoute);
      instance.register(getExpensesRoute);
      instance.register(getBalancesRoute);
    },
    { prefix: '/expenses' },
  );

  app.register(
    async (instance) => {
      instance.register(meRoute);
    },
    { prefix: '/user' },
  );

  app.register(
    async (instance) => {
      instance.register(createPaymentRoute);
    },
    { prefix: '/payments' },
  );
};
