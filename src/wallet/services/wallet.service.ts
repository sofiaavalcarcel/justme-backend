import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { ProfessionalsService } from '../../professionals/services/professionals.service';

@Injectable()
export class WalletService {
    private readonly LOW_BALANCE_USD = 5;
    private readonly MIN_BALANCE_USD = -5;
    private readonly LOW_BALANCE_COP = 20000;
    private readonly MIN_BALANCE_COP = -20000;

    constructor(
        @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
        @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
        private professionalsService: ProfessionalsService,
    ) {}

    async getOrCreateWallet(professionalId: number): Promise<Wallet> {
        // ULTRA-LIGHT CHECK: Direct query to avoid heavy relations that cause 500 errors
        const proExists = await this.walletRepo.query(
            'SELECT id FROM professionals WHERE id = $1',
            [professionalId]
        );
        
        if (!proExists || proExists.length === 0) {
            throw new BadRequestException(`Professional ID ${professionalId} does not exist in DB.`);
        }

        let wallet = await this.walletRepo.findOne({
            where: { professionalId },
        });

        if (!wallet) {
            wallet = this.walletRepo.create({ professionalId, balance: 0, currency: 'COP' });
            wallet = await this.walletRepo.save(wallet);
        }

        return wallet;
    }

    async getWalletWithTransactions(professionalId: number) {
        const wallet = await this.getOrCreateWallet(professionalId);
        const transactions = await this.transactionRepo.find({
            where: { walletId: wallet.id },
            order: { createdAt: 'DESC' },
            take: 50,
        });
        return { ...wallet, transactions };
    }

    async processPayment(professionalId: number, amount: number, description: string, userId: number) {
        const commissionRate = this.configService.get<number>('config.platform.commissionRate') || 0.09;
        const commission = amount * commissionRate;
        const netAmount = amount - commission;

        const wallet = await this.getOrCreateWallet(professionalId);

        // Create payment transaction
        await this.transactionRepo.save(
            this.transactionRepo.create({
                walletId: wallet.id,
                type: TransactionType.PAYMENT,
                amount: netAmount,
                description,
                status: TransactionStatus.COMPLETED,
            }),
        );

        // Create commission transaction
        await this.transactionRepo.save(
            this.transactionRepo.create({
                walletId: wallet.id,
                type: TransactionType.COMMISSION,
                amount: -commission,
                description: `${(commissionRate * 100).toFixed(0)}% commission — ${description}`,
                status: TransactionStatus.COMPLETED,
            }),
        );

        // Update balance
        wallet.balance = Number(wallet.balance) + netAmount;
        await this.walletRepo.save(wallet);

        // Check low balance
        await this.checkBalance(wallet, professionalId, userId);

        return wallet;
    }

    async recharge(professionalId: number, amount: number) {
        try {
            const wallet = await this.getOrCreateWallet(professionalId);
            const rechargeAmount = Number(amount);

            if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
                throw new BadRequestException('Invalid recharge amount');
            }

            await this.transactionRepo.save(
                this.transactionRepo.create({
                    walletId: wallet.id,
                    type: TransactionType.RECHARGE,
                    amount: rechargeAmount,
                    description: 'Wallet recharge',
                    status: TransactionStatus.COMPLETED,
                }),
            );

            wallet.balance = Number(wallet.balance) + rechargeAmount;
            const updatedWallet = await this.walletRepo.save(wallet);

            // Check if professional should become visible again
            const minBalance = this.getMinBalance(wallet.currency);
            if (Number(updatedWallet.balance) > minBalance) {
                await this.professionalsService.setVisibility(professionalId, true);
            }

            return updatedWallet;
        } catch (error) {
            console.error(`Recharge failed for professional ${professionalId}:`, error);
            throw error;
        }
    }

    private async checkBalance(wallet: Wallet, professionalId: number, userId: number) {
        const lowThreshold = this.getLowBalanceThreshold(wallet.currency);
        const minBalance = this.getMinBalance(wallet.currency);

        if (Number(wallet.balance) <= lowThreshold) {
            await this.notificationsService.send(
                userId,
                'Low Wallet Balance',
                `Your wallet balance is low (${wallet.currency} ${wallet.balance}). Please recharge to continue receiving bookings.`,
                NotificationType.WALLET,
                { walletId: wallet.id },
            );
        }

        if (Number(wallet.balance) < minBalance) {
            await this.professionalsService.setVisibility(professionalId, false);
            await this.notificationsService.send(
                userId,
                'Profile Hidden',
                'Your profile has been hidden from search results due to negative wallet balance. Please recharge.',
                NotificationType.WALLET,
                { walletId: wallet.id },
            );
        }
    }

    private getLowBalanceThreshold(currency: string): number {
        return currency === 'COP' ? this.LOW_BALANCE_COP : this.LOW_BALANCE_USD;
    }

    private getMinBalance(currency: string): number {
        return currency === 'COP' ? this.MIN_BALANCE_COP : this.MIN_BALANCE_USD;
    }
}
