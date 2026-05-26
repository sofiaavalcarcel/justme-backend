import { AppDataSource } from './src/database/data-source';

(async () => {
    try {
        await AppDataSource.initialize();
        const query = 'SELECT "experience" FROM "professionals" LIMIT 1';
        console.log(`Running: ${query}`);
        const result = await AppDataSource.query(query);
        console.log('Result:', result);
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error running query:', error);
    }
})();
