import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const appRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Greet the world',
        description: 'cu',
        tags: ['Default'],
        response: {
          200: z.object({
            message: z.string(),
          }),
        },
        params: z.object({
          id: z.string(),
        }),
      },
    },
    (_, reply) => {
      reply.status(200).send({ message: 'Hello World' });
    },
  );
};
