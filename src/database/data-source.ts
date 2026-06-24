import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { enviroments } from '../enviroments';
import { buildDataSourceOptions } from './typeorm.options';

const envFile =
  enviroments[process.env.NODE_ENV as keyof typeof enviroments] || enviroments.dev;

if (!process.env.RENDER) {
  dotenv.config({ path: envFile });
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
