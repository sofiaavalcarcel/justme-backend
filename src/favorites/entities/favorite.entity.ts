import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('favorites')
@Unique(['userId', 'professionalId'])
export class Favorite {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @ManyToOne('Professional', { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column()
    professionalId: number;

    @CreateDateColumn()
    createdAt: Date;
}
