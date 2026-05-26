import { AppDataSource } from '../database/data-source';
import * as bcrypt from 'bcrypt';
import { ModuleEntity } from '../modules/entities/module.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Professional } from '../professionals/entities/professional.entity';
import { PortfolioImage } from '../professionals/entities/portfolio-image.entity';
import { Service } from '../services/entities/service.entity';
import { ProfessionalService } from '../services/entities/professional-service.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Schedule } from '../schedule/entities/schedule.entity';
import { Booking, BookingStatus, LocationType } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Transaction, TransactionType, TransactionStatus } from '../wallet/entities/transaction.entity';
import { Favorite } from '../favorites/entities/favorite.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const moduleRepo = AppDataSource.getRepository(ModuleEntity);
        const roleRepo = AppDataSource.getRepository(Role);
        const userRepo = AppDataSource.getRepository(User);
        const proRepo = AppDataSource.getRepository(Professional);
        const serviceRepo = AppDataSource.getRepository(Service);
        const proServiceRepo = AppDataSource.getRepository(ProfessionalService);
        const walletRepo = AppDataSource.getRepository(Wallet);
        const scheduleRepo = AppDataSource.getRepository(Schedule);
        const bookingRepo = AppDataSource.getRepository(Booking);
        const reviewRepo = AppDataSource.getRepository(Review);
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const favoriteRepo = AppDataSource.getRepository(Favorite);

        // Limpiar tablas con TRUNCATE para reiniciar IDs y manejar relaciones
        console.log('🧹 Limpiando base de datos (TRUNCATE)...');
        const tables = [
            'favorites', 'transactions', 'reviews', 'bookings', 'schedules', 
            'professional_services', 'wallets', 'portfolio_images', 'professionals', 
            'user_roles', 'user', 'role_modules', 'role', 'modules'
        ];
        
        for (const table of tables) {
            try {
                await AppDataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
            } catch (e) {
                try { await AppDataSource.query(`DELETE FROM "${table}"`); } catch (err) {}
            }
        }
        console.log('✅ Base de datos limpia.');

        // 1. Crear Módulos
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
            const m = moduleRepo.create(mod);
            savedModules.push(await moduleRepo.save(m));
        }

        // 2. Crear Roles
        console.log('🛡️ Inicializando Roles...');
        const rAdmin = await roleRepo.save(roleRepo.create({ name: 'admin', description: 'Admin', modules: savedModules }));
        const rPro = await roleRepo.save(roleRepo.create({ name: 'professional', description: 'Professional', modules: savedModules.filter(m => [2,3,4,5,6,8,9,14].includes(m.id)) }));
        const rUser = await roleRepo.save(roleRepo.create({ name: 'user', description: 'Customer', modules: savedModules.filter(m => [1,2,3,4,5,7,9,13,14].includes(m.id)) }));

        // 3. Crear Categorías de Servicios
        console.log('✂️ Creando Categorías de Servicios...');
        const servicesData = [
            { name: 'Corte de Cabello', category: 'Barbería', icon: 'scissors', description: 'Cortes modernos y clásicos para caballeros' },
            { name: 'Manicura Spa', category: 'Nails', icon: 'sparkles', description: 'Tratamiento completo de manos' },
            { name: 'Masaje Relajante', category: 'Bienestar', icon: 'heart', description: 'Masaje de cuerpo completo 1 hora' },
            { name: 'Tintura Global', category: 'Peluquería', icon: 'palette', description: 'Cambio de color completo' },
            { name: 'Maquillaje Social', category: 'Eventos', icon: 'camera', description: 'Maquillaje para galas y cenas' }
        ];
        const savedServices = await Promise.all(servicesData.map(s => serviceRepo.save(serviceRepo.create(s))));

        // 4. Crear Usuarios y Profesionales en DUITAMA
        const password = await bcrypt.hash('Password123!', 10);
        console.log('👥 Creando Usuarios y Perfiles en Duitama...');

        const proData = [
            { name: 'Carlos', last: 'Pérez', email: 'carlos@pro.com', bio: 'Barbero certificado con 8 años de experiencia.', lat: 5.8268, lng: -73.0331, addr: 'Centro, Duitama' },
            { name: 'María', last: 'López', email: 'maria@pro.com', bio: 'Especialista en nail art y cuidado personal.', lat: 5.8350, lng: -73.0280, addr: 'Av. Circunvalar, Duitama' },
            { name: 'Diana', last: 'Gómez', email: 'diana@pro.com', bio: 'Terapeuta holística orientada al bienestar.', lat: 5.8180, lng: -73.0400, addr: 'La Esperanza, Duitama' }
        ];

        const savedPros: Professional[] = [];
        for (const p of proData) {
            const user = await userRepo.save(userRepo.create({
                name: p.name, lastName: p.last, docType: 'CC', docNumber: Math.random().toString().slice(2, 11),
                email: p.email, password, roles: [rPro, rUser]
            }));

            const pro = await proRepo.save(proRepo.create({
                userId: user.id, bio: p.bio, latitude: p.lat, longitude: p.lng, address: p.addr,
                serviceRadius: 10, verified: true, certificationNumber: 'CERT-' + user.id, specialties: 'General'
            }));
            savedPros.push(pro);

            await walletRepo.save(walletRepo.create({ professionalId: pro.id, balance: 250.00, currency: 'USD' }));

            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            for (const dayName of days) {
                await scheduleRepo.save(scheduleRepo.create({ professionalId: pro.id, dayOfWeek: dayName, startTime: '08:00', endTime: '18:00', isActive: true }));
            }

            const portfolioRepo = AppDataSource.getRepository(PortfolioImage);
            await portfolioRepo.save(portfolioRepo.create({ professionalId: pro.id, imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', caption: 'Mi espacio de trabajo', order: 1 }));

            for (const s of savedServices) {
                await proServiceRepo.save(proServiceRepo.create({
                    professionalId: pro.id, serviceId: s.id,
                    price: Number((25 + Math.random() * 50).toFixed(2)), 
                    duration: Math.round(30 + Math.random() * 90),
                    description: `Servicio Premium de ${s.name}`, isActive: true
                }));
            }
        }

        // Admin y Clientes
        await userRepo.save(userRepo.create({ name: 'Juan', lastName: 'Admin', docType: 'CC', docNumber: '123', email: 'admin@justme.com', password, roles: [rAdmin] }));

        const customerData = [{ name: 'Sofía', email: 'sofia@user.com' }, { name: 'Andrés', email: 'andres@user.com' }];
        for (const c of customerData) {
            const customer = await userRepo.save(userRepo.create({
                name: c.name, lastName: 'Cliente', docType: 'CC', docNumber: Math.random().toString().slice(2, 11),
                email: c.email, password, roles: [rUser]
            }));

            const targetPro = savedPros[Math.floor(Math.random() * savedPros.length)];
            const proServices = await proServiceRepo.find({ where: { professionalId: targetPro.id } });
            const targetService = proServices[0];

            const pastBooking = await bookingRepo.save(bookingRepo.create({
                userId: customer.id, professionalId: targetPro.id, professionalServiceId: targetService.id,
                date: '2026-03-10', startTime: '10:00', endTime: '11:00',
                status: BookingStatus.COMPLETED, price: targetService.price, locationType: LocationType.PROFESSIONAL
            }));

            await reviewRepo.save(reviewRepo.create({ bookingId: pastBooking.id, professionalId: targetPro.id, userId: customer.id, rating: 5, comment: '¡Excelente!' }));
            await favoriteRepo.save(favoriteRepo.create({ userId: customer.id, professionalId: targetPro.id }));
        }

        console.log('🎉 Seed FULL completado en DUITAMA.');
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
    } finally {
        await AppDataSource.destroy();
        process.exit(0);
    }
}

bootstrap();
