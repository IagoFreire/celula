import pool from './pool.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Limpar tabelas (ordem importa por causa das FKs)
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM finances');
    await client.query('DELETE FROM schedules');
    await client.query('DELETE FROM studies');
    await client.query('DELETE FROM cells');
    await client.query('DELETE FROM users');

    // Resetar sequences
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE cells_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE studies_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE schedules_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE attendance_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE finances_id_seq RESTART WITH 1");

    // ========== USERS ==========
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    // Users criados sem cell_id (será atualizado após criação das cells)
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password, phone, role) VALUES
        ('Administrador', 'admin@celula.com', $1, '(11) 99999-0001', 'admin'),
        ('Juliana Almeida', 'juliana@email.com', $1, '(11) 92345-6789', 'admin'),
        ('Maria Silva', NULL, NULL, '(11) 98765-4321', 'member'),
        ('João Santos', NULL, NULL, '(11) 91234-5678', 'member'),
        ('Ana Oliveira', NULL, NULL, '(11) 97654-3210', 'member'),
        ('Pedro Costa', NULL, NULL, '(11) 93456-7890', 'member'),
        ('Carla Souza', NULL, NULL, '(11) 95678-1234', 'member'),
        ('Lucas Ferreira', NULL, NULL, '(11) 94567-8901', 'member'),
        ('Rafael Lima', NULL, NULL, '(11) 96789-0123', 'member'),
        ('Fernanda Rocha', NULL, NULL, '(11) 91122-3344', 'member')
      RETURNING id
    `, [hashedPassword]);

    const userIds = usersResult.rows.map(r => r.id);
    console.log(`✅ ${userIds.length} usuários criados`);
    console.log('   📧 Admin: admin@celula.com / admin123');
    console.log('   📱 Membros entram pelo celular (sem senha)');

    // ========== CELLS ==========
    const cellsResult = await client.query(`
      INSERT INTO cells (name, description, address, day_of_week, meeting_time, frequency) VALUES
        ('Célula Central', 'Célula principal da igreja', 'Rua da Igreja, 100 - Centro', 3, '19:30', 'weekly'),
        ('Célula Jovens', 'Célula para jovens de 18 a 30 anos', 'Av. Jovem, 500 - Bairro Novo', 5, '20:00', 'weekly'),
        ('Célula Famílias', 'Célula voltada para casais e famílias', 'Rua da Família, 20 - Jardim Feliz', 6, '18:00', 'biweekly'),
        ('Célula Mulheres', 'Célula de mulheres, encontros quinzenais', 'Rua das Rosas, 30 - Vila Bela', 4, '15:00', 'biweekly'),
        ('Célula Homens', 'Célula de homens, encontros aos sábados', 'Av. dos Homens, 10 - Indústria', 6, '08:00', 'monthly')
      RETURNING id
    `);

    const cellIds = cellsResult.rows.map(r => r.id);
    console.log(`✅ ${cellIds.length} células criadas`);

    // Associar membros às células
    // Maria(2), João(3), Pedro(5) -> Célula Central
    await client.query('UPDATE users SET cell_id = $1 WHERE id IN ($2, $3, $4)', [cellIds[0], userIds[2], userIds[3], userIds[5]]);
    // Ana(4), Lucas(7), Rafael(8) -> Célula Jovens
    await client.query('UPDATE users SET cell_id = $1 WHERE id IN ($2, $3, $4)', [cellIds[1], userIds[4], userIds[7], userIds[8]]);
    // Carla(6), Fernanda(9) -> Célula Famílias
    await client.query('UPDATE users SET cell_id = $1 WHERE id IN ($2, $3)', [cellIds[2], userIds[6], userIds[9]]);
    console.log('✅ Membros associados às células');

    // ========== STUDIES ==========
    const studiesResult = await client.query(`
      INSERT INTO studies (title, description, content, category, keywords, created_by) VALUES
        (
          'O Poder da Oração',
          'Estudo sobre a importância e o poder da oração na vida cristã',
          'A oração é a comunicação direta com Deus. Neste estudo vamos explorar diferentes formas de oração mencionadas na Bíblia e como podemos desenvolver uma vida de oração mais profunda.\n\n1. O que é oração?\n2. Tipos de oração\n3. Exemplos bíblicos\n4. Como desenvolver uma vida de oração',
          'Vida Cristã',
          'oração, devoção, vida cristã, comunhão',
          $1
        ),
        (
          'Frutos do Espírito',
          'Estudo detalhado sobre os 9 frutos do Espírito Santo em Gálatas 5',
          'Em Gálatas 5:22-23, Paulo nos ensina sobre os frutos do Espírito: amor, alegria, paz, paciência, amabilidade, bondade, fidelidade, mansidão e domínio próprio.\n\nVamos estudar cada um deles em profundidade.',
          'Espírito Santo',
          'frutos, espírito santo, gálatas, caráter cristão',
          $1
        ),
        (
          'Parábolas de Jesus',
          'As principais parábolas de Jesus e suas lições para hoje',
          'Jesus usou parábolas para ensinar verdades espirituais profundas de forma simples e acessível.\n\n1. O Semeador\n2. O Filho Pródigo\n3. O Bom Samaritano\n4. Os Talentos\n5. As Dez Virgens',
          'Estudos Bíblicos',
          'parábolas, jesus, ensinamentos, evangelhos',
          $2
        ),
        (
          'Relacionamentos Saudáveis',
          'Como construir relacionamentos saudáveis baseados em princípios bíblicos',
          'A Bíblia nos ensina muito sobre como devemos nos relacionar uns com os outros.\n\nPrincípios fundamentais:\n- Amor ao próximo\n- Perdão\n- Comunicação\n- Respeito mútuo',
          'Vida Cristã',
          'relacionamentos, amor, perdão, comunidade',
          $2
        ),
        (
          'Liderança Servidora',
          'O modelo de liderança de Jesus baseado no serviço',
          'Jesus mostrou um modelo completamente diferente de liderança: liderar servindo.\n\nMarcos 10:45 - "Pois nem mesmo o Filho do homem veio para ser servido, mas para servir."\n\nPrincípios da liderança servidora:\n1. Humildade\n2. Empatia\n3. Serviço\n4. Visão\n5. Integridade',
          'Liderança',
          'liderança, serviço, jesus, discipulado',
          $1
        ),
        (
          'Adoração Verdadeira',
          'O significado da adoração verdadeira segundo a Bíblia',
          'João 4:24 - "Deus é espírito, e importa que os que o adoram o adorem em espírito e em verdade."\n\nO que significa adorar em espírito e verdade? Como podemos oferecer adoração genuína a Deus?',
          'Adoração',
          'adoração, louvor, espírito, verdade',
          $2
        )
      RETURNING id
    `, [userIds[0], userIds[1]]);

    const studyIds = studiesResult.rows.map(r => r.id);
    console.log(`✅ ${studyIds.length} estudos criados`);

    // ========== SCHEDULES ==========
    const today = new Date();
    const dates = [];
    for (let i = -14; i <= 28; i += 7) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const schedulesResult = await client.query(`
      INSERT INTO schedules (cell_id, title, date, time, location, leader_id, study_id, notes) VALUES
        ($1, 'Reunião de Célula Central', $6, '19:30', 'Igreja Central - Sala 1', $12, $18, 'Trazer Bíblia e caderno'),
        ($2, 'Célula Jovens - Louvor e Palavra', $7, '20:00', 'Casa do João - Rua das Flores, 123', $13, $19, 'Noite de louvor e estudo'),
        ($3, 'Encontro de Famílias', $8, '18:00', 'Salão Social da Igreja', $14, $20, 'Trazer um prato para compartilhar'),
        ($1, 'Célula Central - Estudo Bíblico', $9, '19:30', 'Igreja Central - Sala 1', $15, $21, 'Estudo dos frutos do Espírito'),
        ($2, 'Jovens em Ação', $10, '20:00', 'Casa da Ana - Av. Principal, 456', $16, $22, 'Dinâmica em grupo'),
        ($4, 'Encontro de Mulheres', $11, '15:00', 'Casa da Carla - Rua Nova, 789', $17, $23, 'Chá da tarde e estudo'),
        ($1, 'Célula Central - Oração', $6, '19:30', 'Igreja Central - Sala 1', $12, NULL, 'Noite dedicada à oração'),
        ($5, 'Café com Propósito - Homens', $9, '08:00', 'Cafeteria Aroma - Centro', $15, NULL, 'Café da manhã e comunhão'),
        ($3, 'Famílias em Adoração', $10, '18:00', 'Salão Social da Igreja', $16, $18, 'Noite de adoração em família'),
        ($2, 'Jovens - Noite de Jogos', $11, '19:00', 'Quadra da Igreja', $13, NULL, 'Integração e diversão. Trazer roupas confortáveis')
      RETURNING id
    `, [
      cellIds[0], cellIds[1], cellIds[2], cellIds[3], cellIds[4], // $1-$5 cells
      dates[0], dates[0], dates[1], dates[1], dates[2], dates[2], // $6-$11 dates
      userIds[0], userIds[3], userIds[0], userIds[1], userIds[4], userIds[6], // $12-$17 leaders
      studyIds[0], studyIds[2], studyIds[3], studyIds[1], studyIds[4], studyIds[5], // $18-$23 studies
    ]);

    const scheduleIds = schedulesResult.rows.map(r => r.id);
    console.log(`✅ ${scheduleIds.length} reuniões/cronogramas criados`);

    // ========== ATTENDANCE ==========
    const attendanceInserts = [];
    const attendanceParams = [];
    let paramIdx = 1;

    const attendanceData = [
      // Reunião 1 - vários membros
      [scheduleIds[0], [userIds[0], userIds[2], userIds[3], userIds[4], userIds[5], userIds[7]]],
      // Reunião 2 - jovens
      [scheduleIds[1], [userIds[3], userIds[4], userIds[7], userIds[8]]],
      // Reunião 3 - famílias
      [scheduleIds[2], [userIds[0], userIds[2], userIds[5], userIds[6], userIds[1], userIds[9]]],
      // Reunião 4
      [scheduleIds[3], [userIds[0], userIds[2], userIds[3], userIds[6], userIds[1]]],
      // Reunião 5
      [scheduleIds[4], [userIds[3], userIds[4], userIds[7], userIds[8], userIds[9]]],
      // Reunião 6 - mulheres
      [scheduleIds[5], [userIds[2], userIds[4], userIds[6], userIds[9]]],
    ];

    for (const [schedId, userIdList] of attendanceData) {
      for (const uid of userIdList) {
        attendanceInserts.push(`($${paramIdx}, $${paramIdx + 1})`);
        attendanceParams.push(schedId, uid);
        paramIdx += 2;
      }
    }

    await client.query(`
      INSERT INTO attendance (schedule_id, user_id) VALUES ${attendanceInserts.join(', ')}
    `, attendanceParams);

    console.log(`✅ ${attendanceInserts.length} registros de presença criados`);

    // ========== FINANCES ==========
    const finMonth1 = new Date(today);
    finMonth1.setMonth(finMonth1.getMonth() - 1);
    const fm1 = finMonth1.toISOString().split('T')[0];

    const finMonth2 = new Date(today);
    finMonth2.setMonth(finMonth2.getMonth() - 2);
    const fm2 = finMonth2.toISOString().split('T')[0];

    const thisMonth = today.toISOString().split('T')[0];

    await client.query(`
      INSERT INTO finances (cell_id, type, category, amount, description, date, created_by) VALUES
        ($1, 'income', 'Dízimo', 1500.00, 'Dízimos do mês', $6, $10),
        ($1, 'income', 'Oferta', 850.00, 'Ofertas da célula central', $6, $10),
        ($2, 'income', 'Oferta', 320.00, 'Ofertas dos jovens', $6, $10),
        ($1, 'expense', 'Material', 150.00, 'Compra de materiais de estudo', $7, $10),
        ($1, 'expense', 'Alimentação', 200.00, 'Lanche para encontro de famílias', $7, $10),
        ($3, 'income', 'Oferta', 480.00, 'Ofertas do encontro de famílias', $7, $10),
        ($2, 'expense', 'Transporte', 100.00, 'Transporte para retiro de jovens', $7, $11),
        ($1, 'income', 'Dízimo', 1650.00, 'Dízimos do mês', $8, $10),
        ($1, 'income', 'Oferta', 920.00, 'Ofertas gerais', $8, $10),
        ($4, 'income', 'Oferta', 280.00, 'Ofertas do encontro de mulheres', $8, $11),
        ($1, 'expense', 'Manutenção', 350.00, 'Manutenção do salão', $8, $10),
        ($5, 'income', 'Oferta', 190.00, 'Café da manhã - contribuições', $8, $11),
        ($1, 'expense', 'Alimentação', 180.00, 'Café e lanches para reuniões', $9, $10),
        ($3, 'expense', 'Material', 95.00, 'Material didático infantil', $9, $10),
        ($2, 'income', 'Oferta', 410.00, 'Ofertas da célula jovens', $9, $11)
    `, [
      cellIds[0], cellIds[1], cellIds[2], cellIds[3], cellIds[4], // $1-$5 cells
      fm2, fm1, thisMonth, // $6-$8 dates
      dates[dates.length - 1], // $9 future date
      userIds[0], userIds[1], // $10-$11 created_by
    ]);

    console.log('✅ 15 transações financeiras criadas');

    await client.query('COMMIT');
    console.log('\n🎉 Seed concluído com sucesso!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
