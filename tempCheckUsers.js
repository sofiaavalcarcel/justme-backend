const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_sa1y5itNZpkF@ep-misty-dew-ap4wya37.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkUserColumns() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user';");
    console.log('User columns:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUserColumns();
