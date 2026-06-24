import { DataSourceOptions } from 'typeorm';
import { ConfigType } from '@nestjs/config';
import { join } from 'path';
import config from '../config';

export function buildTypeOrmConnectionOptions(
  configType?: ConfigType<typeof config>,
): DataSourceOptions {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  const base: Partial<DataSourceOptions> = {
    type: 'postgres',
    synchronize: false,
    ssl: hasDatabaseUrl ? { rejectUnauthorized: false } : false,
  };

  if (hasDatabaseUrl) {
    return {
      ...base,
      url: process.env.DATABASE_URL,
    } as DataSourceOptions;
  }

  const db = configType?.dataBase ?? config().dataBase;

  return {
    ...base,
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.password,
    database: db.name,
  } as DataSourceOptions;
}

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    ...buildTypeOrmConnectionOptions(),
    logging: true,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
