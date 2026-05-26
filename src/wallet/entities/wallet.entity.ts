import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';


import { Professional } from '../../professionals/entities/professional.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Professional, (pro) => pro.wallet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: Professional;

    @Column()
    professionalId: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    balance: number;

    @Column({ type: 'varchar', length: 10, default: 'USD' })
    currency: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Transaction, (txn) => txn.wallet)
    transactions: Transaction[];
}
