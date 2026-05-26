import { AppDataSource } from '../database/data-source';
import * as bcrypt from 'bcrypt';
import { ModuleEntity } from '../modules/entities/module.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const moduleRepo = AppDataSource.getRepository(ModuleEntity);
        const roleRepo = AppDataSource.getRepository(Role);
        const userRepo = AppDataSource.getRepository(User);

        // 1. Crear Módulos Básicos
        console.log('📦 Inicializando Módulos...');
        const modulesData = [
            { id: 1, name: 'users', description: 'Gestión de usuarios' },
            { id: 2, name: 'professionals', description: 'Gestión de profesionales' },
            { id: 3, name: 'services', description: 'Gestión de servicios' },
            { id: 4, name: 'bookings', description: 'Gestión de reservas' },
            { id: 5, name: 'reviews', description: 'Gestión de reseñas' },
            { id: 6, name: 'schedule', description: 'Gestión de agenda' },
            { id: 7, name: 'favorites', description: 'Gestión de favoritos' },
            { id: 8, name: 'wallet', description: 'Gestión de billetera' },
            { id: 9, name: 'payments', description: 'Gestión de pagos' },
            { id: 10, name: 'roles', description: 'Gestión de roles' },
            { id: 11, name: 'modules', description: 'Gestión de módulos' },
            { id: 12, name: 'admin', description: 'Panel de administración' },
            { id: 13, name: 'coupons', description: 'Gestión de cupones' },
            { id: 14, name: 'notifications', description: 'Gestión de notificaciones' }
        ];

        const savedModules: ModuleEntity[] = [];
        for (const mod of modulesData) {
            let existingModule = await moduleRepo.findOne({ where: { name: mod.name } });
            if (!existingModule) {
                // Al forzar el ID insertando directamente, aseguramos consistencia
                await moduleRepo.query(`INSERT INTO "modules" ("id", "name", "description") VALUES ($1, $2, $3)`, [mod.id, mod.name, mod.description]);
                existingModule = await moduleRepo.findOne({ where: { id: mod.id } });
            }
            if (existingModule) savedModules.push(existingModule);
        }
        console.log(`✅ Módulos inicializados (${savedModules.length}).`);

        // 2. Crear Roles
        console.log('🛡️ Inicializando Roles...');
        const rolesData = [
            {
                name: 'admin',
                description: 'Administrador del sistema',
                modules: savedModules // Todos los módulos
            },
            {
                name: 'professional',
                description: 'Profesional que ofrece servicios',
                modules: savedModules.filter((m: any) => [2, 3, 4, 5, 6, 8, 9, 14].includes(m.id))
            },
            {
                name: 'user',
                description: 'Cliente final',
                modules: savedModules.filter((m: any) => [1, 2, 3, 4, 5, 7, 9, 13, 14].includes(m.id))
            }
        ];

        const savedRoles: Role[] = [];
        for (const r of rolesData) {
            let role = await roleRepo.findOne({ where: { name: r.name } });
            if (!role) {
                role = roleRepo.create({ name: r.name, description: r.description, modules: r.modules });
            } else {
                role.modules = r.modules;
            }
            role = await roleRepo.save(role);
            savedRoles.push(role);
        }
        console.log(`✅ Roles inicializados (${savedRoles.length}).`);

        // 3. Crear Admin User
        console.log('👤 Buscando usuario administrador...');
        const adminEmail = 'admin@justme.com';
        let adminUser = await userRepo.findOne({ where: { email: adminEmail } });

        if (!adminUser) {
            console.log('⚠️ Usuario administrador no encontrado. Creando...');
            const adminRole = savedRoles.find(r => r.name === 'admin');
            if (!adminRole) throw new Error('Rol admin no encontrado');

            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            adminUser = userRepo.create({
                name: 'Super',
                lastName: 'Admin',
                docType: 'CC', // Requeridos por tu entidad
                docNumber: '000000000', // Requeridos por tu entidad
                email: adminEmail,
                password: hashedPassword,
                roles: [adminRole]
            });
            await userRepo.save(adminUser);
            console.log('✅ Usuario Administrador Creado:');
            console.log(`   - Email: ${adminEmail}`);
            console.log(`   - Password: Admin123!`);
        } else {
            console.log('✅ Usuario administrador ya existe.');
        }

        console.log('🎉 Seed completado exitosamente.');
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
    } finally {
        await AppDataSource.destroy();
        process.exit(0);
    }
}

bootstrap();
