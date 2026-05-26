import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // 1. Get port from ConfigService (recommended way)
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 3000;

    // 2. Security Middlewares
    // Temporarily disabled helmet to debug NotSameOrigin
    /*
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
    }));
    */

    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // Serve static files with explicit cross-origin header
    app.use('/uploads', express.static(join(process.cwd(), 'uploads'), {
        setHeaders: (res) => {
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            res.set('Access-Control-Allow-Origin', '*');
        }
    }));

    // 3. Global Pipes & Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            exceptionFactory: (errors) => {
                const messages = errors.map((err) => ({
                    field: err.property,
                    errors: Object.values(err.constraints || {}),
                }));
                return new BadRequestException({ message: 'Validation failed', errors: messages });
            },
        }),
    );

    // 4. API Prefix
    app.setGlobalPrefix('api');

    // 4.5 Global Interceptors
    app.useGlobalInterceptors(new TransformResponseInterceptor());

    // 5. Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('JustMe API')
        .setDescription('JustMe — Location-based beauty marketplace API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    // 6. Start Application
    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
    logger.log(`📖 Documentation available at: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
    const logger = new Logger('BootstrapError');
    logger.error('Critical failure during application startup', err);
    process.exit(1);
});
