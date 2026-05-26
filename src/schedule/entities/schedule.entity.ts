import {
    Column,
    Entity,
    ManyToOne,
    JoinColumn,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('schedules')
export class Schedule {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('Professional', 'schedules', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professionalId' })
    professional: any;

    @Column()
    professionalId: number;

    @Column({ type: 'varchar', length: 20, comment: 'e.g. Monday, Tuesday, etc.' })
    dayOfWeek: string;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany('ScheduleBreak', 'schedule', { eager: true, cascade: true })
    breaks: any[];
}
