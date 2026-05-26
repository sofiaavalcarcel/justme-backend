import { AppDataSource } from '../database/data-source';
import { ModuleEntity } from '../modules/entities/module.entity';
import { Role } from '../roles/entities/role.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const moduleRepo = AppDataSource.getRepository(ModuleEntity);
        const roleRepo = AppDataSource.getRepository(Role);

        // 1. Definir los módulos/permisos granulares
        console.log('📦 Creando módulos/permisos granulares...');
        const rbacModules = [
            // Admin permissions
            { name: 'admin.dashboard', description: 'Acceso al dashboard de administrador' },
            { name: 'admin.users', description: 'Gestión de usuarios' },
            { name: 'admin.professionals', description: 'Gestión de profesionales' },
            { name: 'admin.services', description: 'Gestión de servicios' },
            { name: 'admin.transactions', description: 'Gestión de transacciones' },
            { name: 'admin.analytics', description: 'Acceso a analíticas del sistema' },
            { name: 'admin.settings', description: 'Configuración del sistema' },
            
            // Professional permissions
            { name: 'pro.dashboard', description: 'Acceso al dashboard de profesional' },
            { name: 'pro.calendar', description: 'Gestión de agenda y calendario' },
            { name: 'pro.services', description: 'Gestión de servicios propios' },
            { name: 'pro.bookings', description: 'Gestión de reservas recibidas' },
            { name: 'pro.wallet', description: 'Gestión de billetera y ganancias' },
            { name: 'pro.analytics', description: 'Analíticas del profesional' },
            
            // User permissions
            { name: 'user.search', description: 'Búsqueda de profesionales' },
            { name: 'user.bookings', description: 'Gestión de reservas propias' },
            { name: 'user.favorites', description: 'Gestión de favoritos' },
            { name: 'user.profile', description: 'Gestión de perfil de usuario' },
        ];

        const savedModules: ModuleEntity[] = [];
        for (const mod of rbacModules) {
            // Update or create
            let existingModule = await moduleRepo.findOne({ where: { name: mod.name } });
            if (!existingModule) {
                existingModule = moduleRepo.create(mod);
                await moduleRepo.save(existingModule);
            }
            savedModules.push(existingModule);
        }

        // 2. Asignar módulos a los roles existentes
        console.log('🛡️ Asignando permisos a roles...');
        const adminRole = await roleRepo.findOne({ where: { name: 'admin' }, relations: ['modules'] });
        const proRole = await roleRepo.findOne({ where: { name: 'professional' }, relations: ['modules'] });
        const userRole = await roleRepo.findOne({ where: { name: 'user' }, relations: ['modules'] });

        if (adminRole) {
            adminRole.modules = savedModules.filter(m => m.name.startsWith('admin.'));
            await roleRepo.save(adminRole);
            console.log('✅ Permisos de Admin actualizados.');
        }

        if (proRole) {
            proRole.modules = savedModules.filter(m => m.name.startsWith('pro.'));
            await roleRepo.save(proRole);
            console.log('✅ Permisos de Profesional actualizados.');
        }

        if (userRole) {
            userRole.modules = savedModules.filter(m => m.name.startsWith('user.'));
            await roleRepo.save(userRole);
            console.log('✅ Permisos de Usuario actualizados.');
        }

        console.log('🎉 Seed de RBAC completado exitosamente.');
    } catch (error) {
        console.error('❌ Error durante el seed de RBAC:', error);
    } finally {
        await AppDataSource.destroy();
        process.exit(0);
    }
}

bootstrap();
