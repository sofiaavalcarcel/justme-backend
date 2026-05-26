import {
    Column,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('schedule_breaks')
export class ScheduleBreak {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('Schedule', 'breaks', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scheduleId' })
    schedule: any;

    @Column()
    scheduleId: number;

    @Column({ type: 'varchar', length: 100 })
    title: string;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;
}
