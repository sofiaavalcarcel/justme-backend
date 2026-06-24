import { registerAs } from "@nestjs/config";

export default registerAs('config', () => {
    return {
        // Puerto general de la app mapeado centralizadamente
        port: parseInt(process.env.PORT || '3000', 10),
        dataBase: {
            name: process.env.POSTGRES_DB || '',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            user: process.env.POSTGRES_USER || '',
            password: process.env.POSTGRES_PASSWORD || '',
            host: process.env.POSTGRES_HOST || 'localhost',
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'fallbackSecretKey',
            expiresIn: parseInt(process.env.JWT_EXPIRES_IN ?? '3600', 10),
            refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallbackRefreshSecretKey',
            refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10),
        },
        platform: {
            commissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.09'),
            uploadDir: process.env.UPLOAD_DIR ?? './uploads',
            corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY || '',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        },
        redis: {
            url: process.env.REDIS_URL || '',
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        mail: {
            host: process.env.MAIL_HOST || '',
            user: process.env.MAIL_USER || '',
            password: process.env.MAIL_PASSWORD || '',
            from: process.env.MAIL_FROM || '',
        },
        cloudinary: {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
            apiKey: process.env.CLOUDINARY_API_KEY || '',
            apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        },
        ollama: {
            url: process.env.OLLAMA_URL || '',
            model: process.env.OLLAMA_MODEL || '',
        },
    };
});