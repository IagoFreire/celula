import pool from './pool.js';

const migration = `
-- ========================================
-- Tabela: users
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(50) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ========================================
-- Tabela: cells (células)
-- ========================================
CREATE TABLE IF NOT EXISTS cells (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500),
  day_of_week SMALLINT,
  meeting_time VARCHAR(10),
  frequency VARCHAR(20) DEFAULT 'weekly',
  next_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- Tabela: studies (estudos)
-- ========================================
CREATE TABLE IF NOT EXISTS studies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  file_path VARCHAR(500),
  category VARCHAR(100),
  keywords VARCHAR(500),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studies_category ON studies(category);
CREATE INDEX IF NOT EXISTS idx_studies_created_by ON studies(created_by);

-- ========================================
-- Tabela: schedules (cronogramas/reuniões)
-- ========================================
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  cell_id INTEGER REFERENCES cells(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL,
  location VARCHAR(255) NOT NULL,
  leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  study_id INTEGER REFERENCES studies(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_cell_id ON schedules(cell_id);

-- ========================================
-- Tabela: attendance (presenças)
-- ========================================
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_schedule ON attendance(schedule_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

-- ========================================
-- Tabela: finances (finanças)
-- ========================================
CREATE TABLE IF NOT EXISTS finances (
  id SERIAL PRIMARY KEY,
  cell_id INTEGER REFERENCES cells(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finances_type ON finances(type);
CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(date);
CREATE INDEX IF NOT EXISTS idx_finances_cell_id ON finances(cell_id);

-- Migração: membros sem email (email e password opcionais, phone único)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Migração: associar membros a células
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cell_id'
  ) THEN
    ALTER TABLE users ADD COLUMN cell_id INTEGER REFERENCES cells(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_cell_id ON users(cell_id);

-- Migração: endereço da célula
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'cells' AND column_name = 'address'
  ) THEN
    ALTER TABLE cells ADD COLUMN address VARCHAR(500);
  END IF;
END $$;

-- Migração: dia, horário e frequência da célula
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'cells' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE cells ADD COLUMN day_of_week SMALLINT;
    ALTER TABLE cells ADD COLUMN meeting_time VARCHAR(10);
    ALTER TABLE cells ADD COLUMN frequency VARCHAR(20) DEFAULT 'weekly';
  END IF;
END $$;

-- Migração: data da próxima reunião (next_date)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'cells' AND column_name = 'next_date'
  ) THEN
    ALTER TABLE cells ADD COLUMN next_date DATE;
  END IF;
END $$;

-- ========================================
-- Tabela: schedule_cancellations (cancelamentos de reunião)
-- ========================================
CREATE TABLE IF NOT EXISTS schedule_cancellations (
  id SERIAL PRIMARY KEY,
  cell_id INTEGER NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cell_id, date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_cancellations_cell_date ON schedule_cancellations(cell_id, date);
`;

async function migrate() {
  console.log('🚀 Iniciando migração do banco de dados...\n');

  try {
    await pool.query(migration);
    console.log('✅ Migração concluída com sucesso!');
    console.log('   - Tabela "users" criada');
    console.log('   - Tabela "cells" criada');
    console.log('   - Tabela "studies" criada');
    console.log('   - Tabela "schedules" criada');
    console.log('   - Tabela "attendance" criada');
    console.log('   - Tabela "finances" criada');
    console.log('   - Índices criados');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

migrate();
