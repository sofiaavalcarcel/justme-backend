import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { ProfessionalService } from './entities/professional-service.entity';
import { ServicesService } from './services/services.service';
import { ServicesController } from './controllers/services.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Service, ProfessionalService])],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService],
})
export class ServicesModule {}
