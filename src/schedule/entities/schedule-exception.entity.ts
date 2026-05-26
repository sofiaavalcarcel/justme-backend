import {
    Column,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('schedule_exceptions')
export class ScheduleException {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('Professional', 'exceptions', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column()
    professionalId: number;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'time', nullable: true })
    startTime: string;

    @Column({ type: 'time', nullable: true })
    endTime: string;

    @Column({ type: 'boolean', default: true })
    isFullDay: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    reason: string;
}
