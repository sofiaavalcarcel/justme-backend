import { AppDataSource } from './src/database/data-source';
import { Professional } from './src/professionals/entities/professional.entity';

(async () => {
    try {
        await AppDataSource.initialize();
        const proRepo = AppDataSource.getRepository(Professional);
        
        console.log('Searching for professional with id 3...');
        const pro = await proRepo.findOne({ where: { id: 3 } });
        
        if (pro) {
            console.log('Found Professional:', pro.id);
            console.log('Experience field value:', pro.experience);
        } else {
            console.log('Professional with id 3 not found.');
        }
        
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error during test:', error);
    }
})();
