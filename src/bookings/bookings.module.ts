import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { ProfessionalService } from '../services/entities/professional-service.entity';
import { BookingsService } from './services/bookings.service';
import { BookingsController } from './controllers/bookings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Booking, ProfessionalService]),
        forwardRef(() => NotificationsModule),
        ProfessionalsModule,
        WalletModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService],
    exports: [BookingsService],
})
export class BookingsModule {}
