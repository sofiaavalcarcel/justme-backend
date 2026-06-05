const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_sa1y5itNZpkF@ep-misty-dew-ap4wya37.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkDb() {
  try {
    const res = await pool.query('SELECT * FROM incentive_programs;');
    console.log('All rows:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDb();
