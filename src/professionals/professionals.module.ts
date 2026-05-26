import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from './entities/professional.entity';
import { PortfolioImage } from './entities/portfolio-image.entity';
import { User } from '../users/entities/user.entity';
import { ProfessionalsService } from './services/professionals.service';
import { ProfessionalsController } from './controllers/professionals.controller';
import { ProfessionalStatsService } from './services/professional-stats.service';
import { ProfessionalStatsController } from './controllers/professional-stats.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { ScheduleModule } from '../schedule/schedule.module';

// Entities from other modules needed for stats aggregation
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { IncentiveProgram } from '../coupons/entities/incentive-program.entity';

@Module({
    imports: [
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
            storage: diskStorage({
                destination: './uploads/portfolio',
                filename: (_req, file, cb) => {
                    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                    cb(null, uniqueName);
                },
            }),
        }),
    ],
    controllers: [ProfessionalsController, ProfessionalStatsController],
    providers: [ProfessionalsService, ProfessionalStatsService],
    exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
