import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Professional } from './entities/professional.entity';
import { PortfolioImage } from './entities/portfolio-image.entity';
import { User } from '../users/entities/user.entity';
import { ProfessionalsService } from './services/professionals.service';
import { ProfessionalsController } from './controllers/professionals.controller';
import { ProfessionalStatsService } from './services/professional-stats.service';
import { ProfessionalStatsController } from './controllers/professional-stats.controller';
import { CloudinaryService } from './services/cloudinary.service';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ScheduleModule } from '../schedule/schedule.module';

// Entities from other modules needed for stats aggregation
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { IncentiveProgram } from '../coupons/entities/incentive-program.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            Professional,
            PortfolioImage,
            User,
            Booking,
            Review,
            Wallet,
            Transaction,
            IncentiveProgram,
        ]),
        forwardRef(() => ScheduleModule),
        MulterModule.register({
            storage: multer.memoryStorage(),
        }),
    ],
    controllers: [ProfessionalsController, ProfessionalStatsController],
    providers: [ProfessionalsService, ProfessionalStatsService, CloudinaryService],
    exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
