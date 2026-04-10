import { fastifyCors } from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { fastifySwagger } from '@fastify/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import { fastify } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './env';
import authenticate from './plugins/authenticate';
import errorHandler from './plugins/error-handler';
import { routes } from './routes/routes';
import fastifyCookie from '@fastify/cookie';
// import { recoverPasswordRoute } from './routes/recover-password';

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
});

app.register(fastifyCookie, {
  secret: env.COOKIE_SECRET,
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API Documentation',
      description: 'documentation',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
});

app.register(ScalarApiReference, {
  routePrefix: '/docs',
});

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'accessToken',
    signed: false,
  },
});

app.register(errorHandler);
app.register(authenticate);
app.register(routes, { prefix: '/api' });

app.ready().then(() => {
  app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
    console.log(`Server: http://localhost:${env.PORT}`);
    console.log(`Docs: http://localhost:${env.PORT}/docs`);
  });
});
