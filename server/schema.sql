-- Sacrament Agenda Database Schema

-- Users table for authentication and authorization
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER')),
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Name groups for dropdowns (presiding, conducting, chorister, organist)
CREATE TABLE name_groups (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('presiding', 'conducting', 'chorister', 'organist')),
    name VARCHAR(255) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom hymns
CREATE TABLE custom_hymns (
    id SERIAL PRIMARY KEY,
    number VARCHAR(10) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart text templates
CREATE TABLE smart_text (
    id SERIAL PRIMARY KEY,
    text_key VARCHAR(50) UNIQUE NOT NULL CHECK (text_key IN ('openingText', 'reverenceText', 'appreciationText')),
    content TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved agendas
CREATE TABLE agendas (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    data JSONB NOT NULL,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, created_by)
);

-- Sessions for persistent login
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_name_groups_category ON name_groups(category);
CREATE INDEX idx_custom_hymns_number ON custom_hymns(number);
CREATE INDEX idx_agendas_date ON agendas(date);
CREATE INDEX idx_agendas_created_by ON agendas(created_by);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- Default data will be inserted by the API when first admin user registers

-- Update timestamps will be handled by the API