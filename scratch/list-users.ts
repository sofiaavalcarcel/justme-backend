import { AppDataSource } from '../src/database/data-source';

async function listUsers() {
    await AppDataSource.initialize();
    const users = await AppDataSource.query(`SELECT id, email, name, "lastName", "isActive" FROM "user"`);
    console.log("USERS:", JSON.stringify(users));
    
    const bookings = await AppDataSource.query(`SELECT id, "userId", "professionalId", date, status FROM bookings LIMIT 10`);
    console.log("BOOKINGS:", JSON.stringify(bookings));
    
    await AppDataSource.destroy();
}
listUsers();
