import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { IncentiveProgram } from './entities/incentive-program.entity';
import { CouponsService } from './services/coupons.service';
import { CouponsController } from './controllers/coupons.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon, IncentiveProgram])],
    controllers: [CouponsController],
    providers: [CouponsService],
    exports: [CouponsService],
})
export class CouponsModule {}
