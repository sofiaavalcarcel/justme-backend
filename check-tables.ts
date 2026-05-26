import { AppDataSource } from './src/database/data-source';

(async () => {
    try {
        await AppDataSource.initialize();
        const queryRunner = AppDataSource.createQueryRunner();
        const tables = await queryRunner.getTables();
        console.log('Tables in database:');
        tables.forEach(t => console.log(`- ${t.name}`));
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
})();
