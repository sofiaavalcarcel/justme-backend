import { AppDataSource } from '../src/database/data-source';
import { Service } from '../src/services/entities/service.entity';

async function run() {
    await AppDataSource.initialize();
    const serviceRepo = AppDataSource.getRepository(Service);
    const categories = await serviceRepo.find({ where: { isActive: true } });
    console.log("Categories returned to frontend:", categories);
    process.exit(0);
}

run();
