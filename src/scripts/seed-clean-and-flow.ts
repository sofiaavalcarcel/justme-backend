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
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const moduleRepo = AppDataSource.getRepository(ModuleEntity);
        const roleRepo = AppDataSource.getRepository(Role);
        const userRepo = AppDataSource.getRepository(User);
        const proRepo = AppDataSource.getRepository(Professional);
        const proServiceRepo = AppDataSource.getRepository(ProfessionalService);
        const serviceRepo = AppDataSource.getRepository(Service);
        const walletRepo = AppDataSource.getRepository(Wallet);
        const scheduleRepo = AppDataSource.getRepository(Schedule);
        const bookingRepo = AppDataSource.getRepository(Booking);
        const reviewRepo = AppDataSource.getRepository(Review);
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const favoriteRepo = AppDataSource.getRepository(Favorite);
        const notificationRepo = AppDataSource.getRepository(Notification);
        const portfolioRepo = AppDataSource.getRepository(PortfolioImage);

        // 1. Limpieza de tablas transaccionales y relacionales
        console.log('🧹 Limpiando datos transaccionales de las tablas...');
        const transactionalTables = [
            'favorites',
            'notifications',
            'transactions',
            'reviews',
            'bookings',
            'schedules',
            'professional_services',
            'wallets',
            'portfolio_images',
            'professionals',
        ];

        for (const table of transactionalTables) {
            try {
                await AppDataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
                console.log(`   - Tabla "${table}" truncada.`);
            } catch (e) {
                console.warn(`   ⚠️ Fallo al truncar "${table}", intentando DELETE...`);
                try {
                    await AppDataSource.query(`DELETE FROM "${table}"`);
                } catch (err) {
                    console.error(`   ❌ Error al vaciar "${table}":`, err.message);
                }
            }
        }

        // 2. Preservar usuarios activos y borrar inactivos
        console.log('👥 Gestionando usuarios (preservando activos)...');
        
        // Desvincular roles de usuarios inactivos
        await AppDataSource.query(`
            DELETE FROM "user_roles" 
            WHERE "userId" IN (SELECT id FROM "user" WHERE "isActive" = false)
        `);
        console.log('   - Roles desvinculados de usuarios inactivos.');

        // Borrar usuarios inactivos
        const deleteUsersResult = await userRepo.delete({ isActive: false });
        console.log(`   - Usuarios inactivos eliminados: ${deleteUsersResult.affected ?? 0}`);

        const activeUsersCount = await userRepo.count({ where: { isActive: true } });
        console.log(`   - Usuarios activos conservados en la base de datos: ${activeUsersCount}`);

        // 3. Asegurar existencia de módulos y roles
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
                await moduleRepo.query(`INSERT INTO "modules" ("id", "name", "description") VALUES ($1, $2, $3)`, [mod.id, mod.name, mod.description]);
                existingModule = await moduleRepo.findOne({ where: { id: mod.id } });
            }
            if (existingModule) savedModules.push(existingModule);
        }

        console.log('🛡️ Inicializando Roles...');
        const rolesData = [
            {
                name: 'admin',
                description: 'Administrador del sistema',
                modules: savedModules
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

        const savedRoles: Record<string, Role> = {};
        for (const r of rolesData) {
            let role = await roleRepo.findOne({ where: { name: r.name } });
            if (!role) {
                role = roleRepo.create({ name: r.name, description: r.description, modules: r.modules });
            } else {
                role.modules = r.modules;
            }
            role = await roleRepo.save(role);
            savedRoles[r.name] = role;
        }

        // Asegurar que exista al menos un usuario Administrador activo si no hay ninguno
        const adminEmail = 'admin@justme.com';
        let adminUser = await userRepo.findOne({ where: { email: adminEmail } });
        if (!adminUser) {
            const password = await bcrypt.hash('Admin123!', 10);
            adminUser = await userRepo.save(userRepo.create({
                name: 'Super',
                lastName: 'Admin',
                docType: 'CC',
                docNumber: '10000000',
                email: adminEmail,
                password,
                isActive: true,
                roles: [savedRoles['admin']]
            }));
            console.log('👤 Administrador por defecto creado.');
        }

        // 4. Crear Servicios base de prueba
        console.log('✂️ Creando Categorías de Servicios...');
        const servicesData = [
            { name: 'Corte de Cabello', category: 'Barbería', icon: 'scissors', description: 'Cortes modernos y clásicos para caballeros' },
            { name: 'Manicura Spa', category: 'Nails', icon: 'sparkles', description: 'Tratamiento completo de manos' },
            { name: 'Masaje Relajante', category: 'Bienestar', icon: 'heart', description: 'Masaje de cuerpo completo 1 hora' },
            { name: 'Tintura Global', category: 'Peluquería', icon: 'palette', description: 'Cambio de color completo' },
            { name: 'Maquillaje Social', category: 'Eventos', icon: 'camera', description: 'Maquillaje para galas y cenas' }
        ];
        const savedServices = await Promise.all(servicesData.map(s => serviceRepo.save(serviceRepo.create(s))));

        // 5. Crear Nuevos Profesionales y Clientes de prueba
        console.log('👥 Sembrando nuevos profesionales y clientes...');
        const passwordHash = await bcrypt.hash('Password123!', 10);

        const prosInfo = [
            { name: 'Carlos', last: 'Pérez', email: 'carlos@pro.com', bio: 'Barbero certificado con 8 años de experiencia.', lat: 5.8268, lng: -73.0331, addr: 'Centro, Duitama' },
            { name: 'María', last: 'López', email: 'maria@pro.com', bio: 'Especialista en nail art y cuidado personal.', lat: 5.8350, lng: -73.0280, addr: 'Av. Circunvalar, Duitama' },
            { name: 'Diana', last: 'Gómez', email: 'diana@pro.com', bio: 'Terapeuta holística orientada al bienestar.', lat: 5.8180, lng: -73.0400, addr: 'La Esperanza, Duitama' }
        ];

        const savedPros: Professional[] = [];
        const savedWallets: Wallet[] = [];
        const savedProServices: ProfessionalService[] = [];

        for (const p of prosInfo) {
            // Crear o buscar usuario profesional
            let user = await userRepo.findOne({ where: { email: p.email } });
            if (!user) {
                user = await userRepo.save(userRepo.create({
                    name: p.name,
                    lastName: p.last,
                    docType: 'CC',
                    docNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    email: p.email,
                    password: passwordHash,
                    isActive: true,
                    roles: [savedRoles['professional'], savedRoles['user']]
                }));
            } else {
                user.isActive = true;
                user.roles = [savedRoles['professional'], savedRoles['user']];
                user = await userRepo.save(user);
            }

            // Crear perfil profesional
            const pro = await proRepo.save(proRepo.create({
                userId: user.id,
                bio: p.bio,
                latitude: p.lat,
                longitude: p.lng,
                address: p.addr,
                serviceRadius: 10,
                verified: true,
                certificationNumber: 'CERT-' + user.id,
                specialties: 'General',
                averageRating: 4.8
            }));
            savedPros.push(pro);

            // Crear billetera para el profesional con saldo operativo inicial
            const initialTopUp = 500000;
            const wallet = await walletRepo.save(walletRepo.create({
                professionalId: pro.id,
                balance: initialTopUp,
                currency: 'COP'
            }));
            savedWallets.push(wallet);

            // Registrar la recarga inicial como transacción TOP_UP
            await transactionRepo.save(transactionRepo.create({
                walletId: wallet.id,
                type: TransactionType.TOP_UP,
                amount: initialTopUp,
                balanceBefore: 0,
                balanceAfter: initialTopUp,
                description: 'Saldo operativo inicial de bienvenida (seed)',
                status: TransactionStatus.COMPLETED,
            } as any));

            // Horario de atención
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            for (const dayName of days) {
                await scheduleRepo.save(scheduleRepo.create({
                    professionalId: pro.id,
                    dayOfWeek: dayName,
                    startTime: '08:00',
                    endTime: '18:00',
                    isActive: true
                }));
            }

            // Portfolio
            await portfolioRepo.save(portfolioRepo.create({
                professionalId: pro.id,
                imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
                caption: 'Espacio de trabajo de ' + p.name,
                order: 1
            }));

            // Vincular servicios
            for (const s of savedServices) {
                const ps = await proServiceRepo.save(proServiceRepo.create({
                    professionalId: pro.id,
                    serviceId: s.id,
                    price: Math.round((40000 + Math.random() * 80000) / 1000) * 1000, // Precios realistas en COP (40K - 120K)
                    duration: Math.round(30 + Math.random() * 60),
                    description: `Servicio Premium de ${s.name}`,
                    isActive: true
                }));
                ps.service = s;
                savedProServices.push(ps);
            }
        }

        // Crear clientes de prueba
        const customersInfo = [
            { name: 'Sofía', last: 'Ortega', email: 'sofia@user.com' },
            { name: 'Andrés', last: 'Cárdenas', email: 'andres@user.com' },
            { name: 'Laura', last: 'Mendoza', email: 'laura@user.com' }
        ];

        const savedCustomers: User[] = [];
        for (const c of customersInfo) {
            let customer = await userRepo.findOne({ where: { email: c.email } });
            if (!customer) {
                customer = await userRepo.save(userRepo.create({
                    name: c.name,
                    lastName: c.last,
                    docType: 'CC',
                    docNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    email: c.email,
                    password: passwordHash,
                    isActive: true,
                    roles: [savedRoles['user']]
                }));
            } else {
                customer.isActive = true;
                customer.roles = [savedRoles['user']];
                customer = await userRepo.save(customer);
            }
            savedCustomers.push(customer);
        }

        // 6. Sembrar reservas históricas y actuales (últimos 12 meses)
        console.log('📅 Generando reservas e historial transaccional de los últimos 12 meses...');
        
        const now = new Date();
        let totalRevenueSum = 0;
        let totalCommissionSum = 0;

        // Bucle por cada uno de los últimos 12 meses
        for (let m = 0; m < 12; m++) {
            const dateOffset = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1);
            const year = dateOffset.getFullYear();
            const month = dateOffset.getMonth() + 1; // 1-indexed
            
            // Generar entre 6 y 12 reservas por mes
            const bookingsInMonthCount = Math.floor(6 + Math.random() * 7);
            
            for (let b = 0; b < bookingsInMonthCount; b++) {
                const customer = savedCustomers[Math.floor(Math.random() * savedCustomers.length)];
                const professional = savedPros[Math.floor(Math.random() * savedPros.length)];
                
                // Buscar servicios del profesional seleccionado
                const proServices = savedProServices.filter(ps => ps.professionalId === professional.id);
                const proService = proServices[Math.floor(Math.random() * proServices.length)];

                // Generar día aleatorio en el mes
                const lastDayOfMonth = new Date(year, month, 0).getDate();
                const randomDay = Math.floor(1 + Math.random() * lastDayOfMonth);
                
                // Formatear fecha
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;
                
                // Evitar reservas futuras marcadas como completadas
                const bookingDate = new Date(year, month - 1, randomDay);
                let status = BookingStatus.COMPLETED;
                if (bookingDate > now) {
                    status = Math.random() > 0.5 ? BookingStatus.CONFIRMED : BookingStatus.PENDING;
                } else {
                    // Histórico: 85% completadas, 15% canceladas
                    status = Math.random() > 0.15 ? BookingStatus.COMPLETED : BookingStatus.CANCELLED;
                }

                const price = Number(proService.price);
                const startTime = `${String(8 + Math.floor(Math.random() * 8)).padStart(2, '0')}:00:00`;
                const endTime = `${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:00:00`;

                // Crear Booking
                const booking = await bookingRepo.save(bookingRepo.create({
                    userId: customer.id,
                    professionalId: professional.id,
                    professionalServiceId: proService.id,
                    date: dateStr,
                    startTime,
                    endTime,
                    status,
                    price,
                    location: professional.address,
                    locationType: LocationType.PROFESSIONAL,
                    latitude: professional.latitude,
                    longitude: professional.longitude,
                    createdAt: bookingDate,
                    updatedAt: bookingDate
                }));

                // Si está completada, creamos transacción de comisión del 9% (nuevo modelo operativo)
                if (status === BookingStatus.COMPLETED) {
                    const wallet = savedWallets.find(w => w.professionalId === professional.id);
                    if (wallet) {
                        const commissionRate = 0.09;
                        const commissionAmount = Math.round(price * commissionRate);
                        const balanceBefore = Number(wallet.balance);
                        const balanceAfter = balanceBefore - commissionAmount;

                        // COMMISSION: 9% deducted automatically on booking completion
                        const commissionTx = transactionRepo.create({
                            walletId: wallet.id,
                            type: TransactionType.COMMISSION,
                            amount: -commissionAmount,
                            serviceAmount: price,
                            commissionPercentage: commissionRate,
                            balanceBefore,
                            balanceAfter,
                            relatedBookingId: booking.id,
                            description: `Comisión de plataforma (9%) por reserva #${booking.id}: ${proService.service?.name ?? 'Servicio'}`,
                            status: TransactionStatus.COMPLETED,
                            createdAt: bookingDate,
                        } as any);
                        await transactionRepo.save(commissionTx);
                        totalCommissionSum += commissionAmount;

                        // Deduct from wallet balance
                        wallet.balance = Math.max(0, balanceAfter);
                        await walletRepo.save(wallet);
                    }

                    // Se crea reseña aleatoria (50% de probabilidad)
                    if (Math.random() > 0.5) {
                        const ratings = [4, 4.5, 5];
                        const comments = [
                            'Excelente atención, muy profesional.',
                            'Me encantó el servicio. Recomendado 100%.',
                            'Llegó a tiempo y el resultado fue grandioso.',
                            'Muy detallista y con buena conversación.',
                            'Excelente técnica, volveré a reservar sin duda.'
                        ];
                        await reviewRepo.save(reviewRepo.create({
                            bookingId: booking.id,
                            professionalId: professional.id,
                            userId: customer.id,
                            rating: ratings[Math.floor(Math.random() * ratings.length)],
                            comment: comments[Math.floor(Math.random() * comments.length)],
                            createdAt: bookingDate
                        }));
                    }
                }
            }
        } // cierra for m (12 meses)

        // Generar citas específicas para hoy y esta semana (junio 2026) para interactuar en el Pro Dashboard
        console.log('📅 Generando citas específicas para hoy y esta semana...');
        const daysToSeed = [
            { offset: 0, status: BookingStatus.PENDING, label: 'Hoy (Pendiente)', time: '09:00:00' },
            { offset: 0, status: BookingStatus.PENDING, label: 'Hoy (Pendiente 2)', time: '14:00:00' },
            { offset: 1, status: BookingStatus.PENDING, label: 'Mañana (Pendiente)', time: '10:00:00' },
            { offset: 1, status: BookingStatus.CONFIRMED, label: 'Mañana (Confirmada)', time: '16:00:00' },
            { offset: 2, status: BookingStatus.PENDING, label: 'Pasado Mañana (Pendiente)', time: '11:00:00' },
            { offset: 3, status: BookingStatus.CONFIRMED, label: 'Esta Semana (Confirmada)', time: '15:00:00' }
        ];

        for (const pro of savedPros) {
            const proServices = savedProServices.filter(ps => ps.professionalId === pro.id);
            const proService = proServices[0];
            
            for (let i = 0; i < daysToSeed.length; i++) {
                const dayInfo = daysToSeed[i];
                const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayInfo.offset);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth() + 1;
                const day = targetDate.getDate();
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const customer = savedCustomers[i % savedCustomers.length];
                
                await bookingRepo.save(bookingRepo.create({
                    userId: customer.id,
                    professionalId: pro.id,
                    professionalServiceId: proService.id,
                    date: dateStr,
                    startTime: dayInfo.time,
                    endTime: `${String(1 + Number(dayInfo.time.split(':')[0])).padStart(2, '0')}:00:00`,
                    status: dayInfo.status,
                    price: Number(proService.price),
                    location: pro.address,
                    locationType: LocationType.PROFESSIONAL,
                    latitude: pro.latitude,
                    longitude: pro.longitude,
                    createdAt: targetDate,
                    updatedAt: targetDate
                }));
            }
        }

        // Crear favoritos
        for (const customer of savedCustomers) {
            const targetPro = savedPros[Math.floor(Math.random() * savedPros.length)];
            await favoriteRepo.save(favoriteRepo.create({
                userId: customer.id,
                professionalId: targetPro.id
            })).catch(() => {}); // Ignorar si ya existía combinación única
        }

        // 7. Crear notificaciones recientes
        console.log('🔔 Sembrando notificaciones para administrador y usuarios...');
        const notificationsData = [
            {
                userId: adminUser.id,
                title: 'Nueva Reserva Agendada',
                message: 'El usuario Andrés Cárdenas ha agendado un "Corte de Cabello" con Carlos Pérez.',
                type: NotificationType.BOOKING,
                isRead: false,
                data: { bookingId: 1 }
            },
            {
                userId: adminUser.id,
                title: 'Pago Recibido',
                message: `Se ha registrado un pago de $${totalRevenueSum.toLocaleString('es-CO')} COP en comisiones y transacciones.`,
                type: NotificationType.WALLET,
                isRead: false,
                data: { amount: totalRevenueSum, currency: 'COP' }
            },
            {
                userId: adminUser.id,
                title: 'Nueva Reseña Registrada',
                message: '¡Carlos Pérez ha recibido una calificación de 5 estrellas en su perfil!',
                type: NotificationType.REVIEW,
                isRead: true,
                data: { rating: 5, reviewerName: 'Sofía Ortega' }
            },
            {
                userId: adminUser.id,
                title: 'Polishing del Panel Completado',
                message: 'Se han aplicado correcciones en el panel administrador para mejorar la coherencia de datos.',
                type: NotificationType.SYSTEM,
                isRead: false,
                data: { version: '2.2.0' }
            }
        ];

        for (const notif of notificationsData) {
            await notificationRepo.save(notificationRepo.create(notif));
        }

        console.log('---------------------------------------------------------');
        console.log('🎉 PROCESO DE LIMPIEZA Y CARGA DE DATOS FINALIZADO 🎉');
        console.log(`- Base de datos limpia con integridad referencial.`);
        console.log(`- Usuarios inactivos eliminados.`);
        console.log(`- Administrador base verificado: ${adminEmail}`);
        console.log(`- Nuevos profesionales creados: ${savedPros.length}`);
        console.log(`- Nuevos clientes de prueba creados: ${savedCustomers.length}`);
        console.log(`- Servicios creados: ${savedServices.length}`);
        console.log(`- Simulación de ingresos completa generada.`);
        console.log(`  * Total facturado en simulación (Revenue): $${totalRevenueSum.toLocaleString('es-CO')} COP`);
        console.log(`  * Total comisiones recolectadas: $${totalCommissionSum.toLocaleString('es-CO')} COP`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('❌ Error general durante el seed-clean-and-flow:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    }
}

bootstrap();
