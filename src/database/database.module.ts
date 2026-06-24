import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';
import config from '../config';
import { buildTypeOrmConnectionOptions } from './typeorm.options';

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            inject: [config.KEY],
            useFactory: (configType: ConfigType<typeof config>) => ({
                ...buildTypeOrmConnectionOptions(configType),
                autoLoadEntities: true,
            }),
        }),
    ],
    providers: [],
    exports: [TypeOrmModule]
})
export class DatabaseModule { }
