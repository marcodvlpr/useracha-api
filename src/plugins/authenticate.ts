import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    generateTokens: (payload: { id: string; email: string }) => {
      accessToken: string;
      refreshToken: string;
    };
  }
}

interface Payload {
  id: string;
  email: string;
}

const authenticate: FastifyPluginAsync = async (app) => {
  app.decorate('generateTokens', (payload: Payload) => {
    const accessToken = app.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch {
        return reply
          .status(401)
          .send({ message: 'Unauthorized', error: 'UNAUTHORIZED' });
      }
    },
  );
};

export default fp(authenticate);
