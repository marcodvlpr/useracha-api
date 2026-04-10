// import { db } from '@/db/database';
// import { usersTable } from '@/db/schemas/user-schema';
// import { and, eq, gt } from 'drizzle-orm';
// import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
// import z from 'zod';
// import crypto from 'crypto';

// import { refreshTokensTable } from '@/db/schemas/refresh-tokens';
// import { passwordResetTokensTable } from '@/db/schemas/password-reset-tokens';
// import { Resend } from 'resend';
// import { env } from '@/env';

// const resend = new Resend(env.RESEND_API_KEY);

// export const recoverPasswordRoute: FastifyPluginAsyncZod = async (app) => {
//   app.post(
//     '/recover-password',
//     {
//       schema: {
//         summary: 'Recover Password',
//         description: 'Initiate the password recovery process for a user',
//         tags: ['Authentication'],
//         response: {
//           200: z.object({
//             message: z.string(),
//           }),
//           404: z.object({
//             error: z.literal('USER_NOT_FOUND'),
//             message: z.literal('User with this email not found'),
//           }),
//           401: z.object({
//             error: z.literal('INVALID_PASSWORD'),
//             message: z.literal('Invalid credentials'),
//           }),
//         },
//         body: z.object({
//           email: z.email(),
//         }),
//       },
//     },
//     async (request, reply) => {
//       const { email } = request.body;

//       const userExists = await db
//         .select()
//         .from(usersTable)
//         .where(eq(usersTable.email, email))
//         .limit(1);

//       if (userExists.length <= 0) {
//         console.log('nao existe');
//         return reply
//           .status(200)
//           .send({ message: 'Reset link sent if email exists' });
//       }

//       const resetPasswordToken = crypto.randomBytes(32).toString('hex');

//       await db.insert(passwordResetTokensTable).values({
//         userId: userExists[0].id,
//         token: resetPasswordToken,
//         expiresAt: new Date(Date.now() + 15 * 60 * 1000),
//       });

//       await resend.emails.send({
//         from: 'useracha.com',
//         to: userExists[0].email,
//         subject: 'Recuperação de senha',
//         html: `<h2>Olá, ${userExists[0].name}</h2>
//         <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha:</p>
//         <a href="http://localhost:3333/reset-password?token=${resetPasswordToken}">Redefinir Senha</a>
//         <p>O link expira em 15 minutos.</p>
//         <p>Se você não solicitou essa alteração, por favor ignore este email.</p>
//         <p>Atenciosamente,<br/>Equipe Useracha</p>`,
//       });

//       return reply
//         .status(200)
//         .send({ message: 'Reset link sent if email exists (foi)' });
//     },
//   );
// };
