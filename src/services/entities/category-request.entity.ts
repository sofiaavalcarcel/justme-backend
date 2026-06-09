import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export type CategoryRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Solicitud de un profesional para agregar una nueva categoría de servicio
 * al catálogo global. El admin la aprueba o rechaza desde el panel de admin.
 */
@Entity('category_requests')
export class CategoryRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    professionalId: number;

    @ManyToOne('Professional', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 100 })
    category: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    icon: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending',
    })
    status: CategoryRequestStatus;

    @Column({ type: 'text', nullable: true })
    adminNotes: string;

    @Column({ nullable: true })
    reviewedBy: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
