declare module 'fastify' {
  interface FastifyRequest {
    cookies: {
      accessToken?: string;
      refreshToken?: string;
    };
    user: {
      id: string;
      email: string;
      iat: number;
      exp: number;
    };
  }
}

export {};
