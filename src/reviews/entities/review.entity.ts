import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @ManyToOne('Professional', 'reviews')
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column()
    professionalId: number;

    @Column({ nullable: true })
    bookingId: number;

    @OneToOne('Booking', { nullable: true })
    @JoinColumn({ name: 'bookingId' })
    booking: any;

    @Column({ type: 'decimal', precision: 2, scale: 1 })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}
