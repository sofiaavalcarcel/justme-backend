import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'root',
  password: '123456',
  database: 'justme_db',
  synchronize: false,
});

async function run() {
  await AppDataSource.initialize();
  const users = await AppDataSource.query(`
    SELECT email, password FROM "user" LIMIT 1
  `);
  console.log(users);
  await AppDataSource.destroy();
}

run().catch(console.error);
