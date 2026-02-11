import pool from './pool.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  console.log('🔐 Criando usuário administrador inicial...\n');

  try {
    // Verificar se já existe um admin
    const { rows: existing } = await pool.query(
      "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (existing.length > 0) {
      console.log(`⚠️  Já existe um administrador cadastrado: ${existing[0].email} (id: ${existing[0].id})`);
      console.log('   Nenhuma alteração foi feita.');
      await pool.end();
      return;
    }

    const email = 'admin@celula.com';
    const password = 'admin123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      ['Administrador', email, hashedPassword, null, 'admin']
    );

    console.log('✅ Administrador criado com sucesso!');
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Senha: ${password}`);
    console.log(`   🆔 ID: ${rows[0].id}`);
    console.log('\n⚠️  Altere a senha após o primeiro login!');
  } catch (err) {
    console.error('❌ Erro ao criar administrador:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

createAdmin();
