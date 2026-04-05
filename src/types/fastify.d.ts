declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      iat: number;
      exp: number;
    };
  }
}

export {};
