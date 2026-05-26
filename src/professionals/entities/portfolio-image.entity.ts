import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Professional } from './professional.entity';

@Entity('portfolio_images')
export class PortfolioImage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Professional, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: Professional;

    @Column()
    professionalId: number;

    @Column({ type: 'varchar', length: 500 })
    imageUrl: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    caption: string;

    @Column({ type: 'int', default: 0 })
    order: number;

    @CreateDateColumn()
    createdAt: Date;
}
