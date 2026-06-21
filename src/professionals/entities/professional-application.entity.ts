import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ProfessionalApplicationStatus = 'pending' | 'approved' | 'rejected';

@Entity('professional_applications')
export class ProfessionalApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending',
    })
    status: ProfessionalApplicationStatus;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    certifications: string[];

    @Column({ type: 'text', nullable: true })
    adminNotes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
