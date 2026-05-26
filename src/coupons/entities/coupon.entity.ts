import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string;

    @Column({ type: 'int', comment: 'Discount percentage (15, 20, 30)' })
    discount: number;

    @Column({ type: 'varchar', length: 255 })
    description: string;

    @Column({ type: 'date' })
    expiresAt: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: number;

    @Column({ type: 'boolean', default: false })
    isUsed: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
