-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 03_pacientes.sql - Pacientes (Laravel Compatible con Secuencia y Antecedentes)
-- ==============================================================================

-- 1. Secuencia para el código correlativo de pacientes (Utilizado por PacienteController)
CREATE SEQUENCE IF NOT EXISTS codigo_paciente_seq START 1;

-- 2. Tabla Principal de Pacientes (Compatible 100% con Laravel Paciente Model)
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_paciente VARCHAR(50) UNIQUE NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    fecha_nacimiento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pacientes_cedula ON pacientes(cedula);
CREATE INDEX idx_pacientes_codigo ON pacientes(codigo_paciente);
CREATE INDEX idx_pacientes_nombres ON pacientes(nombres);

-- 3. Enlazar usuario con paciente (Foreign Key bidireccional)
ALTER TABLE users ADD CONSTRAINT fk_users_paciente 
FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;

-- 4. Contactos de Emergencia
CREATE TABLE IF NOT EXISTS pacientes_contactos_emergencia (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contactos_paciente ON pacientes_contactos_emergencia(paciente_id);

-- 5. Antecedentes Médicos Generales (Anamnesis Base)
CREATE TABLE IF NOT EXISTS pacientes_antecedentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    hipertension BOOLEAN DEFAULT FALSE,
    diabetes BOOLEAN DEFAULT FALSE,
    alergias_medicamentos TEXT,
    alergias_otros TEXT,
    enfermedades_cardiacas BOOLEAN DEFAULT FALSE,
    problemas_coagulacion BOOLEAN DEFAULT FALSE,
    embarazo BOOLEAN DEFAULT FALSE,
    meses_embarazo INT,
    medicacion_actual TEXT,
    cirugias_previas TEXT,
    habitos_toxicos TEXT,
    observaciones_medicas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers de actualización de timestamps
CREATE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_antecedentes_updated_at BEFORE UPDATE ON pacientes_antecedentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
