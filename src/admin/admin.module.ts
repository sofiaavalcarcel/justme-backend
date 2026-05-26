import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Professional } from '../professionals/entities/professional.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { Service } from '../services/entities/service.entity';
import { AdminService } from './services/admin.service';
import { AdminAiService } from './services/admin-ai.service';
import { AdminController } from './controllers/admin.controller';
import { AdminAiController } from './controllers/admin-ai.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Professional, Booking, Transaction, Service]),
    ],
    controllers: [AdminController, AdminAiController],
    providers: [AdminService, AdminAiService],
    exports: [AdminAiService],
})
export class AdminModule {}
