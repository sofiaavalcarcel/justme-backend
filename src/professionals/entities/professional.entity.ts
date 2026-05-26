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
import { User } from '../../users/entities/user.entity';

@Entity('professionals')
export class Professional {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, { eager: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    address: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
    serviceRadius: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    certificationNumber: string;

    @Column({ type: 'text', nullable: true })
    specialties: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    experience: string;

    @Column({ type: 'boolean', default: false })
    verified: boolean;

    @Column({ type: 'int', default: 0 })
    completedServices: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    averageRating: number;

    @Column({ type: 'int', default: 0 })
    reviewCount: number;

    @Column({ type: 'boolean', default: true })
    isVisible: boolean;

    @Column({ type: 'int', default: 8 })
    maxAppointments: number;

    @Column({ type: 'int', default: 15, comment: 'Buffer time in minutes' })
    bufferTime: number;

    @Column({ type: 'int', default: 2, comment: 'Advance notice in hours' })
    advanceNotice: number;

    @CreateDateColumn()
    joinDate: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany('ProfessionalService', 'professional')
    professionalServices: any[];

    @OneToMany('PortfolioImage', 'professional')
    portfolioImages: any[];

    @OneToMany('Schedule', 'professional')
    schedules: any[];

    @OneToMany('Booking', 'professional')
    bookings: any[];

    @OneToMany('Review', 'professional')
    reviews: any[];

    @OneToOne('Wallet', 'professional')
    wallet: any;
}
