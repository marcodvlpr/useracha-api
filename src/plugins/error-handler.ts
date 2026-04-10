import type { FastifyPluginAsync } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';

const errorHandler: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, _, reply) => {
    console.log(error);
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation error',
        error: 'VALIDATION_ERROR',
        issues: error.validation.map((issue) => ({
          field: issue.instancePath.replace('/', ''),
          message: issue.message,
        })),
      });
    }

    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
};

export default fp(errorHandler);
