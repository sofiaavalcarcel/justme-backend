import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Wallet } from './wallet.entity';

/**
 * Transaction types for the operational balance model.
 * - TOP_UP:     Professional adds funds via Stripe
 * - COMMISSION: 9% automatically deducted when a booking is COMPLETED
 * - ADJUSTMENT: Manual admin correction or migrated historical record
 * - REFUND:     Commission reversed (e.g. cancelled booking after completed)
 * - BONUS:      Platform credit granted to professional
 */
export enum TransactionType {
    TOP_UP     = 'TOP_UP',
    COMMISSION = 'COMMISSION',
    ADJUSTMENT = 'ADJUSTMENT',
    REFUND     = 'REFUND',
    BONUS      = 'BONUS',
}

export enum TransactionStatus {
    COMPLETED = 'completed',
    PENDING   = 'pending',
    FAILED    = 'failed',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'walletId' })
    wallet: Wallet;

    @Column()
    walletId: number;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    /** Net amount credited (+) or debited (−) to the balance */
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    /** Original service price (for COMMISSION rows) */
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    serviceAmount: number | null;

    /** Commission rate applied, e.g. 0.09 (for COMMISSION rows) */
    @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
    commissionPercentage: number | null;

    /** Balance immediately before this transaction */
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    balanceBefore: number | null;

    /** Balance immediately after this transaction */
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    balanceAfter: number | null;

    /** Booking that triggered this transaction (for COMMISSION rows) */
    @Column({ type: 'int', nullable: true })
    relatedBookingId: number | null;

    @Column({ type: 'varchar', length: 500 })
    description: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.COMPLETED,
    })
    status: TransactionStatus;

    @CreateDateColumn()
    createdAt: Date;
}
