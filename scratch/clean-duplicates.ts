import { AppDataSource } from '../src/database/data-source';

async function clean() {
    await AppDataSource.initialize();
    
    console.log('Finding duplicates in professional_services...');
    // Query to find all professional services that have duplicates (same professionalId and serviceId)
    // We want to group by professionalId, serviceId and find groups with count > 1
    const duplicates = await AppDataSource.query(`
        SELECT "professionalId", "serviceId", COUNT(*) as cnt, MIN(id) as keep_id
        FROM professional_services
        GROUP BY "professionalId", "serviceId"
        HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} duplicate groups.`);
    
    for (const group of duplicates) {
        const { professionalId, serviceId, keep_id } = group;
        console.log(`Processing group for professionalId: ${professionalId}, serviceId: ${serviceId}. Keeping ID: ${keep_id}`);
        
        // Find all other IDs in this group that need to be removed
        const otherRows = await AppDataSource.query(`
            SELECT id FROM professional_services
            WHERE "professionalId" = $1 AND "serviceId" = $2 AND id != $3
        `, [professionalId, serviceId, keep_id]);
        
        const deleteIds = otherRows.map((r: any) => r.id);
        console.log(`IDs to delete:`, deleteIds);
        
        if (deleteIds.length > 0) {
            // Update bookings pointing to the deleted IDs to point to keep_id
            const updateBookingsRes = await AppDataSource.query(`
                UPDATE bookings
                SET "professionalServiceId" = $1
                WHERE "professionalServiceId" = ANY($2::int[])
            `, [keep_id, deleteIds]);
            console.log(`Updated bookings count:`, updateBookingsRes[1] ?? updateBookingsRes);
            
            // Delete the duplicate professional_services rows
            const deleteRes = await AppDataSource.query(`
                DELETE FROM professional_services
                WHERE id = ANY($1::int[])
            `, [deleteIds]);
            console.log(`Deleted professional_services count:`, deleteRes[1] ?? deleteRes);
        }
    }
    
    console.log('Cleanup finished.');
    await AppDataSource.destroy();
}

clean().catch(err => {
    console.error('Error executing cleanup:', err);
});
