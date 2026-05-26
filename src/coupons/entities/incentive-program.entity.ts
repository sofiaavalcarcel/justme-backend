import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum RewardType {
    BONUS = 'bonus',
    COMMISSION_FREE = 'commission_free',
}

@Entity('incentive_programs')
export class IncentiveProgram {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'int' })
    targetServices: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    rewardValue: number;

    @Column({
        type: 'enum',
        enum: RewardType,
        default: RewardType.BONUS,
    })
    rewardType: RewardType;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
