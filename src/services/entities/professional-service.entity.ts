import {
    Column,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    OneToMany,
} from 'typeorm';
import { Service } from './service.entity';

@Entity('professional_services')
export class ProfessionalService {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('Professional', 'professionalServices', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column()
    professionalId: number;

    @ManyToOne(() => Service, service => service.professionalServices, { eager: true })
    @JoinColumn({ name: 'serviceId' })
    service: Service;

    @Column()
    serviceId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'int', comment: 'Duration in minutes' })
    duration: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany('Booking', 'professionalService')
    bookings: any[];
}
