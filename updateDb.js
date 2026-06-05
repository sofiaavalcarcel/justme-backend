const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_sa1y5itNZpkF@ep-misty-dew-ap4wya37.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function updateDb() {
  try {
    const res = await pool.query(`
      UPDATE incentive_programs 
      SET 
        "targetServices" = 200,
        description = 'Completa <b>200 servicios</b> este mes para desbloquear un <b>Bono de Billetera de $50.000</b> y <b>0% de Comisión</b> por una semana.'
      WHERE "isActive" = true
      RETURNING *;
    `);
    console.log('Updated rows:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

updateDb();
