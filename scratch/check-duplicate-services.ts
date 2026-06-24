import { AppDataSource } from '../src/database/data-source';

async function run() {
    await AppDataSource.initialize();
    
    console.log("Cleaning up duplicate professional services...");
    
    // Find all duplicates
    const duplicates = await AppDataSource.query(`
        SELECT "professionalId", "serviceId", array_agg(id) as ids, count(*) as count 
        FROM professional_services 
        GROUP BY "professionalId", "serviceId" 
        HAVING count(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} duplicate pairs.`);
    
    for (const dup of duplicates) {
        // IDs is an array like [10, 25]. We keep the first one (or last) and delete the rest.
        // Postgre array_agg returns standard arrays. 
        // We'll parse it if it comes back as string like '{10,25}'
        let ids = Array.isArray(dup.ids) ? dup.ids : dup.ids.replace(/[{}]/g, '').split(',').map(Number);
        
        // Keep the largest ID (most recent)
        ids.sort((a, b) => b - a);
        const keepId = ids.shift(); // remove largest from list
        
        if (ids.length > 0) {
            console.log(`Keeping ID ${keepId}, deleting IDs ${ids.join(', ')} for professionalId=${dup.professionalId}, serviceId=${dup.serviceId}`);
            await AppDataSource.query(`DELETE FROM professional_services WHERE id IN (${ids.join(',')})`);
        }
    }
    
    console.log("Cleanup complete!");
    process.exit(0);
}

run();
