import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { resolveEnvFile, shouldIgnoreEnvFile } from './enviroments';
import config from './config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Core modules
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthModule } from './auth/auth.module';
import { ModulesModule } from './modules/modules.module';

// Domain modules
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { ScheduleModule } from './schedule/schedule.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FavoritesModule } from './favorites/favorites.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { CouponsModule } from './coupons/coupons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { AuditModule } from './audit/audit.module';
import { AiModule } from './modules/ai/ai.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: resolveEnvFile(),
            ignoreEnvFile: shouldIgnoreEnvFile(),
            load: [config],
            isGlobal: true,
            validationSchema: Joi.object({
                DATABASE_URL: Joi.string().optional(),
                POSTGRES_DB: Joi.when('DATABASE_URL', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.string().required(),
                }),
                POSTGRES_USER: Joi.when('DATABASE_URL', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.string().required(),
                }),
                POSTGRES_PASSWORD: Joi.when('DATABASE_URL', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.string().required(),
                }),
                POSTGRES_PORT: Joi.when('DATABASE_URL', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.number().required(),
                }),
                POSTGRES_HOST: Joi.when('DATABASE_URL', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.string().required(),
                }),
                JWT_SECRET: Joi.string().required(),
                JWT_EXPIRES_IN: Joi.number().required(),
                JWT_REFRESH_SECRET: Joi.string().required(),
                JWT_REFRESH_EXPIRES_IN: Joi.number().required(),
                PLATFORM_COMMISSION_RATE: Joi.number().optional(),
                UPLOAD_DIR: Joi.string().optional(),
                CORS_ORIGIN: Joi.string().optional(),
                REDIS_URL: Joi.string().optional(),
                REDIS_HOST: Joi.string().optional(),
                REDIS_PORT: Joi.number().optional(),
                MAIL_HOST: Joi.string().optional(),
                MAIL_USER: Joi.string().optional(),
                MAIL_PASSWORD: Joi.string().optional(),
                MAIL_FROM: Joi.string().optional(),
                CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
                CLOUDINARY_API_KEY: Joi.string().optional(),
                CLOUDINARY_API_SECRET: Joi.string().optional(),
                GOOGLE_CLIENT_ID: Joi.string().optional(),
                GOOGLE_CLIENT_SECRET: Joi.string().optional(),
                GOOGLE_CALLBACK_URL: Joi.string().optional(),
                STRIPE_SECRET_KEY: Joi.string().optional(),
                STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
                OLLAMA_URL: Joi.string().optional(),
                OLLAMA_MODEL: Joi.string().optional(),
            }),
        }),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'uploads'),
            serveRoot: '/uploads',
        }),
        DatabaseModule,

        // Core
        AuthModule,
        UsersModule,
        RolesModule,
        PermissionsModule,
        ModulesModule,

        // Domain
        ProfessionalsModule,
        ServicesModule,
        ScheduleModule,
        BookingsModule,
        ReviewsModule,
        FavoritesModule,
        WalletModule,
        PaymentsModule,
        CouponsModule,
        NotificationsModule,
        AdminModule,
        MailModule,
        AuditModule,
        AiModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
        },
    ],
})
export class AppModule {}
