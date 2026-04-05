import { fastify } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { fastifySwagger } from '@fastify/swagger';
import { fastifyCors } from '@fastify/cors';
import ScalarApiReference from '@scalar/fastify-api-reference';
import { appRoute } from './app';
import { registerRoute } from './routes/register-route';
import fastifyJwt from '@fastify/jwt';
import { env } from './env';
import { loginRoute } from './routes/login-route';
import authenticate from './plugins/authenticate';
import { meRoute } from './routes/me-route';
import errorHandler from './plugins/error-handler';

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // credentials: true,
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
});

app.register(errorHandler);
app.register(authenticate);
app.register(appRoute);
app.register(
  async (instance) => {
    instance.register(registerRoute);
    instance.register(loginRoute);
    instance.register(meRoute);
  },
  { prefix: '/api' },
);

app.ready().then(() => {
  app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
    console.log(`Server: http://localhost:${env.PORT}`);
    console.log(`Docs: http://localhost:${env.PORT}/docs`);
  });
});
