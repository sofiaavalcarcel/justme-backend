import { registerAs } from "@nestjs/config";

export default registerAs('config', () => {
    return {
        dataBase: {
            name: process.env.POSTGRES_DB,
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            host: process.env.POSTGRES_HOST,
        },
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: parseInt(process.env.JWT_EXPIRES_IN ?? '3600', 10),
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10),
        },
        platform: {
            commissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.09'),
            uploadDir: process.env.UPLOAD_DIR ?? './uploads',
            corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        },
    };
});