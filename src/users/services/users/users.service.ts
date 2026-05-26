import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../../users/dtos/user.dto';
import { RolesService } from '../../../roles/services/roles.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        private rolesService: RolesService,
    ) {}

    async findAll() {
        return await this.userRepo.find({
            relations: {
                roles: {
                    modules: true,
                },
            },
        });
    }

    async findByEmail(email: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            relations: {
                roles: {
                    modules: true,
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`User ${email} not found`);
        }
        return user;
    }

    async findOne(userId: number) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: {
                roles: {
                    modules: true,
                },
            },
        });
        if (!user) {
            throw new NotFoundException(`User #${userId} not found`);
        }
        return user;
    }

    async create(createUserDto: CreateUserDto) {
        const { roleIds, password, ...userData } = createUserDto;
        const hashedPassword = await bcrypt.hash(password, 10);
        const roles = await this.rolesService.findByIds(roleIds);

        if (roles.length !== roleIds.length) {
            throw new NotFoundException('Some roles were not found');
        }

        const newUser = this.userRepo.create({
            ...userData,
            password: hashedPassword,
            roles,
        });
        await this.userRepo.save(newUser);
        
        return this.findOne(newUser.id);
    }

    async createFromRegister(data: {
        name: string;
        lastName: string;
        docType: string;
        docNumber: string;
        email: string;
        phone: string;
        password: string;
        role: string;
    }) {
        // Find or create the role
        let roles = await this.rolesService.findByName(data.role);
        if (!roles) {
            roles = await this.rolesService.createSimple(data.role);
        }

        const newUser = this.userRepo.create({
            name: data.name,
            lastName: data.lastName,
            docType: data.docType,
            docNumber: data.docNumber,
            email: data.email,
            phone: data.phone,
            password: data.password,
            roles: [roles],
        });
        await this.userRepo.save(newUser);
        
        return this.findOne(newUser.id);
    }

    async findOrCreateGoogleUser(profile: any) {
        const { id: googleId, emails, name, photos } = profile;
        const email = emails?.[0]?.value;
        const firstName = name?.givenName || '';
        const lastName = name?.familyName || '';
        const avatar = photos?.[0]?.value || '';

        // Buscar por googleId
        let user = await this.userRepo.findOne({
            where: { googleId },
            relations: { roles: { modules: true } },
        });

        if (user) {
            return user;
        }

        // Buscar por email
        if (email) {
            user = await this.userRepo.findOne({
                where: { email },
                relations: { roles: { modules: true } },
            });

            if (user) {
                // Vincular cuenta Google
                user.googleId = googleId;
                if (user.provider !== 'google') {
                    user.provider = 'google';
                }
                return this.userRepo.save(user);
            }
        }

        // Crear nuevo usuario (como user por defecto)
        let role = await this.rolesService.findByName('user');
        if (!role) {
            role = await this.rolesService.createSimple('user');
        }

        const newUser = this.userRepo.create({
            googleId,
            provider: 'google',
            email: email || `${googleId}@google.user`,
            name: firstName || 'Usuario',
            lastName,
            avatar,
            isActive: true,
            roles: [role],
        });

        await this.userRepo.save(newUser);
        
        return this.findOne(newUser.id);
    }

    async updateUser(id: number, updateUserDto: UpdateUserDto) {
        const { roleIds, password, ...userData } = updateUserDto;

        const user = await this.userRepo.findOne({
            where: { id },
            relations: {
                roles: {
                    modules: true,
                },
            },
        });

        if (!user) throw new NotFoundException('User not found');

        if (roleIds) {
            const roles = await this.rolesService.findByIds(roleIds);
            if (roles.length !== roleIds.length) {
                throw new NotFoundException('Some roles were not found');
            }
            user.roles = roles;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        this.userRepo.merge(user, userData);
        return this.userRepo.save(user);
    }

    async updateRefreshToken(userId: number, refreshToken: string | null) {
        let hashedToken: string | undefined = undefined;
        if (refreshToken) {
            hashedToken = await bcrypt.hash(refreshToken, 10);
        }
        await this.userRepo.update(userId, { refreshToken: hashedToken });
    }

    async incrementLoyaltyPoints(userId: number, points: number) {
        await this.userRepo.increment({ id: userId }, 'loyaltyPoints', points);
    }

    deleteUser(idUser: number) {
        return this.userRepo.delete(idUser);
    }

    async setRecoveryToken(userId: number, token: string, expires: Date) {
        await this.userRepo.update(userId, {
            recoveryToken: token,
            recoveryTokenExpires: expires,
        });
    }

    async updatePassword(userId: number, hashedPassword: string) {
        await this.userRepo.update(userId, {
            password: hashedPassword,
            recoveryToken: undefined as any,
            recoveryTokenExpires: undefined as any,
        });
        // Limpiamos los campos de recuperación directamente con query builder
        await this.userRepo.createQueryBuilder()
            .update()
            .set({ recoveryToken: () => 'NULL', recoveryTokenExpires: () => 'NULL' })
            .where('id = :id', { id: userId })
            .execute();
    }
    async updateAvatar(userId: number, avatarUrl: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        user.avatar = avatarUrl;
        return this.userRepo.save(user);
    }
}
