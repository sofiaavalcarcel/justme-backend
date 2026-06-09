import { DataSource } from 'typeorm';
import config from '../config';
import * as dotenv from 'dotenv';
import { enviroments } from '../enviroments';

import { join } from 'path';

const envFile = enviroments[process.env.NODE_ENV as keyof typeof enviroments] || enviroments.dev;
dotenv.config({ path: envFile });
const configuration = config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : configuration.dataBase.host,
  port: process.env.DATABASE_URL ? undefined : configuration.dataBase.port,
  username: process.env.DATABASE_URL ? undefined : configuration.dataBase.user,
  password: process.env.DATABASE_URL ? undefined : configuration.dataBase.password,
  database: process.env.DATABASE_URL ? undefined : configuration.dataBase.name,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  synchronize: false,
  logging: true,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});