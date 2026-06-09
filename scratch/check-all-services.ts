import { AppDataSource } from '../src/database/data-source';

async function run() {
    await AppDataSource.initialize();
    const services = await AppDataSource.query(`
        SELECT * FROM services
    `);
    console.log("All services:", services);
    process.exit(0);
}

run();
