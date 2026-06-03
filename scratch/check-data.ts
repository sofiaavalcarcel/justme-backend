import { AppDataSource } from '../src/database/data-source';

async function check() {
    await AppDataSource.initialize();
    const tables = [
        'user',
        'professionals',
        'portfolio_images',
        'services',
        'professional_services',
        'wallets',
        'schedules',
        'schedule_breaks',
        'schedule_exceptions',
        'bookings',
        'reviews',
        'transactions',
        'favorites',
        'notifications'
    ];
    for (const t of tables) {
        const res = await AppDataSource.query(`SELECT COUNT(*) as cnt FROM "${t}"`).catch(e => ({ error: e.message }));
        console.log(`${t}:`, JSON.stringify(res));
    }
    await AppDataSource.destroy();
}
check();
