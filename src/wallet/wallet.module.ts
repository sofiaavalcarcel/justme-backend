import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { WalletService } from './services/wallet.service';
import { WalletController } from './controllers/wallet.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Wallet, Transaction]),
        forwardRef(() => NotificationsModule),
        ProfessionalsModule,
    ],
    controllers: [WalletController],
    providers: [WalletService],
    exports: [WalletService],
})
export class WalletModule {}
