import { AppDataSource } from './src/database/data-source';
import { ProfessionalsService } from './src/professionals/services/professionals.service';
import { Professional } from './src/professionals/entities/professional.entity';
import { PortfolioImage } from './src/professionals/entities/portfolio-image.entity';
import { User } from './src/users/entities/user.entity';

(async () => {
    try {
        await AppDataSource.initialize();
        const proRepo = AppDataSource.getRepository(Professional);
        const portfolioRepo = AppDataSource.getRepository(PortfolioImage);
        const userRepo = AppDataSource.getRepository(User);
        
        const service = new ProfessionalsService(proRepo, portfolioRepo, userRepo, null as any);
        
        console.log('Testing matchByService...');
        const results = await service.matchByService({
            serviceId: 1, // Barber
            latitude: 4.711,
            longitude: -74.0721
        });
        
        console.log(`Matched ${results.length} professionals.`);
        results.forEach(p => {
            console.log(`- Pro ID ${p.id}: ${p.user?.name} (Radius: ${p.serviceRadius}km)`);
        });
        
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error during repository match test:', error);
    }
})();
