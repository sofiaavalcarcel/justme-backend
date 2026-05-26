import { Role } from '../../roles/entities/role.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lastName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    docType: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    docNumber: string;

    @Column({ unique: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    password: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatar: string;

    @Column({ type: 'int', default: 0 })
    loyaltyPoints: number;

    @Column({ type: 'varchar', nullable: true })
    recoveryToken: string;

    @Column({ type: 'timestamp', nullable: true })
    recoveryTokenExpires: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'varchar', nullable: true })
    googleId: string;

    @Column({ type: 'varchar', default: 'local' })
    provider: string;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    addresses: any[];

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;
    @Column({ type: 'text', nullable: true })
    refreshToken: string;

    @Column({ type: 'varchar', nullable: true })
    twoFactorSecret: string;

    @Column({ type: 'boolean', default: false })
    isTwoFactorEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToMany(() => Role, role => role.users)
    @JoinTable({
        name: 'user_roles'
    })
    roles: Role[];
}
