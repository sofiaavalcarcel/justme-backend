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
  url: process.env.DATABASE_URL,
  host: !process.env.DATABASE_URL ? configuration.dataBase.host : undefined,
  port: !process.env.DATABASE_URL ? configuration.dataBase.port : undefined,
  username: !process.env.DATABASE_URL ? configuration.dataBase.user : undefined,
  password: !process.env.DATABASE_URL ? configuration.dataBase.password : undefined,
  database: !process.env.DATABASE_URL ? configuration.dataBase.name : undefined,
  synchronize: false,
  logging: true,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});