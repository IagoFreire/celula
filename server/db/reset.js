import pool from './pool.js';

async function reset() {
  console.log('⚠️  Resetando banco de dados...\n');

  try {
    await pool.query(`
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS finances CASCADE;
      DROP TABLE IF EXISTS schedules CASCADE;
      DROP TABLE IF EXISTS studies CASCADE;
      DROP TABLE IF EXISTS cells CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Todas as tabelas removidas com sucesso!\n');
    console.log('Agora rode: npm run db:setup');
  } catch (err) {
    console.error('❌ Erro ao resetar banco:', err.message);
  } finally {
    await pool.end();
  }
}

reset();
