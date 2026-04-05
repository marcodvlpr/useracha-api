import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const meRoute: FastifyPluginAsyncZod = async (app) => {
  app.get('/me', { preHandler: [app.authenticate] }, async (request, _) => {
    return request.user;
  });
};
