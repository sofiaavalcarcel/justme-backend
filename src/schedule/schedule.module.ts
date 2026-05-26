import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleBreak } from './entities/schedule-break.entity';
import { ScheduleException } from './entities/schedule-exception.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { ScheduleService } from './services/schedule.service';
import { ScheduleController } from './controllers/schedule.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { ServicesModule } from '../services/services.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Schedule, ScheduleBreak, ScheduleException, Booking]),
        forwardRef(() => ProfessionalsModule),
        ServicesModule,
    ],
    controllers: [ScheduleController],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
