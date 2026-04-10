import { env } from '@/env';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { usersTable } from './schemas/user-schema';
import { groupMembersTable, groupsTable } from './schemas/groups';
import {
  expensesTable,
  expensesPayersTable,
  expensesSplitsTable,
} from './schemas/expenses';
import { faker } from '@faker-js/faker';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const client = postgres(env.DATABASE_URL, { prepare: false });
const db = drizzle({ client, casing: 'snake_case' });

async function seedDatabase() {
  await db.delete(expensesSplitsTable);
  await db.delete(expensesPayersTable);
  await db.delete(expensesTable);
  await db.delete(groupMembersTable);
  await db.delete(groupsTable);
  await db.delete(usersTable);

  const hashedPassword = await bcrypt.hash('123456', 10);

  // cria 20 usuários
  const users = await db
    .insert(usersTable)
    .values(
      Array.from({ length: 20 }).map(() => ({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: hashedPassword,
      })),
    )
    .returning();

  // cria grupos
  const groups = await db
    .insert(groupsTable)
    .values([
      {
        name: 'Viagem SP',
        description: 'Viagem para São Paulo',
        ownerId: users[0].id,
      },
      {
        name: 'República',
        description: 'Despesas da república',
        ownerId: users[1].id,
      },
      {
        name: 'Churrasco',
        description: 'Churrasco do fim de semana',
        ownerId: users[2].id,
      },
      {
        name: 'Escritório',
        description: 'Despesas do escritório',
        ownerId: users[3].id,
      },
      {
        name: 'Festa',
        description: 'Festa de aniversário',
        ownerId: users[4].id,
      },
    ])
    .returning();

  // membros por grupo
  await db.insert(groupMembersTable).values([
    // Viagem SP — users 0..5
    { groupId: groups[0].id, userId: users[0].id },
    { groupId: groups[0].id, userId: users[1].id },
    { groupId: groups[0].id, userId: users[2].id },
    { groupId: groups[0].id, userId: users[3].id },
    { groupId: groups[0].id, userId: users[4].id },
    { groupId: groups[0].id, userId: users[5].id },

    // República — users 1, 6..10
    { groupId: groups[1].id, userId: users[1].id },
    { groupId: groups[1].id, userId: users[6].id },
    { groupId: groups[1].id, userId: users[7].id },
    { groupId: groups[1].id, userId: users[8].id },
    { groupId: groups[1].id, userId: users[9].id },
    { groupId: groups[1].id, userId: users[10].id },

    // Churrasco — users 2, 11..15
    { groupId: groups[2].id, userId: users[2].id },
    { groupId: groups[2].id, userId: users[11].id },
    { groupId: groups[2].id, userId: users[12].id },
    { groupId: groups[2].id, userId: users[13].id },
    { groupId: groups[2].id, userId: users[14].id },
    { groupId: groups[2].id, userId: users[15].id },

    // Escritório — users 3, 16..19
    { groupId: groups[3].id, userId: users[3].id },
    { groupId: groups[3].id, userId: users[16].id },
    { groupId: groups[3].id, userId: users[17].id },
    { groupId: groups[3].id, userId: users[18].id },
    { groupId: groups[3].id, userId: users[19].id },

    // Festa — users 4, 0, 6, 11, 16
    { groupId: groups[4].id, userId: users[4].id },
    { groupId: groups[4].id, userId: users[0].id },
    { groupId: groups[4].id, userId: users[6].id },
    { groupId: groups[4].id, userId: users[11].id },
    { groupId: groups[4].id, userId: users[16].id },
  ]);

  // despesas para Viagem SP (6 membros)
  const viagem = groups[0];
  const viagemMembers = [
    users[0],
    users[1],
    users[2],
    users[3],
    users[4],
    users[5],
  ];

  const expenses = await db
    .insert(expensesTable)
    .values([
      {
        groupId: viagem.id,
        description: 'Hotel',
        amount: '600.00',
        date: new Date('2026-04-01'),
      },
      {
        groupId: viagem.id,
        description: 'Almoço',
        amount: '180.00',
        date: new Date('2026-04-02'),
      },
      {
        groupId: viagem.id,
        description: 'Uber',
        amount: '90.00',
        date: new Date('2026-04-02'),
      },
      {
        groupId: viagem.id,
        description: 'Jantar',
        amount: '240.00',
        date: new Date('2026-04-03'),
      },
    ])
    .returning();

  // Hotel — users[0] pagou tudo, dividido igualmente entre os 6
  await db
    .insert(expensesPayersTable)
    .values([
      { expenseId: expenses[0].id, userId: users[0].id, amount: '600.00' },
    ]);
  await db.insert(expensesSplitsTable).values(
    viagemMembers.map((u) => ({
      expenseId: expenses[0].id,
      userId: u.id,
      amount: '100.00',
    })),
  );

  // Almoço — users[1] pagou tudo, dividido igualmente
  await db
    .insert(expensesPayersTable)
    .values([
      { expenseId: expenses[1].id, userId: users[1].id, amount: '180.00' },
    ]);
  await db.insert(expensesSplitsTable).values(
    viagemMembers.map((u) => ({
      expenseId: expenses[1].id,
      userId: u.id,
      amount: '30.00',
    })),
  );

  // Uber — users[2] e users[3] pagaram juntos, dividido entre 3
  await db.insert(expensesPayersTable).values([
    { expenseId: expenses[2].id, userId: users[2].id, amount: '50.00' },
    { expenseId: expenses[2].id, userId: users[3].id, amount: '40.00' },
  ]);
  await db.insert(expensesSplitsTable).values([
    { expenseId: expenses[2].id, userId: users[0].id, amount: '30.00' },
    { expenseId: expenses[2].id, userId: users[1].id, amount: '30.00' },
    { expenseId: expenses[2].id, userId: users[2].id, amount: '30.00' },
  ]);

  // Jantar — users[4] pagou tudo, dividido entre 4
  await db
    .insert(expensesPayersTable)
    .values([
      { expenseId: expenses[3].id, userId: users[4].id, amount: '240.00' },
    ]);
  await db.insert(expensesSplitsTable).values([
    { expenseId: expenses[3].id, userId: users[0].id, amount: '60.00' },
    { expenseId: expenses[3].id, userId: users[1].id, amount: '60.00' },
    { expenseId: expenses[3].id, userId: users[2].id, amount: '60.00' },
    { expenseId: expenses[3].id, userId: users[4].id, amount: '60.00' },
  ]);

  console.log('\n   📋 Dados para testar no Postman:');
  console.log(`   Group ID (Viagem SP): ${groups[0].id}`);
  console.log(`   POST /api/groups/${groups[0].id}/expenses`);
  console.log('   Body:');
  console.log(
    JSON.stringify(
      {
        description: 'Almoço',
        amount: 90,
        date: '2026-04-05',
        payers: [{ userId: users[0].id, amount: 90 }],
        splits: [
          { userId: users[0].id, amount: 30 },
          { userId: users[1].id, amount: 30 },
          { userId: users[2].id, amount: 30 },
        ],
      },
      null,
      2,
    ),
  );
  console.log(`\n   Login com: ${users[0].email} / 123456`);
  console.log(`   Group ID (Viagem SP): ${groups[0].id}`);
  await client.end();

  // console.log('☘  Seeded database:');
  // console.log(`   ${users.length} users (password: 123456)`);
  // console.log(`   ${groups.length} groups`);
  // console.log(`   ${expenses.length} expenses no grupo Viagem SP`);
  // console.log('   Users emails:');
  for (const u of users) {
    console.log(`   - ${u.email}`);
  }
}

seedDatabase().catch((e) => console.error(e));
