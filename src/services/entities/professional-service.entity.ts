import {
    Column,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    OneToMany,
    Unique,
} from 'typeorm';
import { Service } from './service.entity';

/**
 * Un profesional tiene exactamente UN registro por categoría de servicio.
 * La restricción UNIQUE(professionalId, serviceId) garantiza que no
 * puede haber duplicados — el UPSERT en ServicesService lo gestiona.
 */
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
