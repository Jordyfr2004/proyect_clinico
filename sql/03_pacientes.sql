-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 03_pacientes.sql - Expedientes de Pacientes y Antecedentes Médicos
-- ==============================================================================

-- 1. Tabla Principal de Pacientes (Expediente Clínico)
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL, -- Enlace con usuario si tiene acceso móvil/web
    cedula_identidad VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(15) CHECK (genero IN ('MASCULINO', 'FEMENINO', 'OTRO')),
    tipo_sangre VARCHAR(5) CHECK (tipo_sangre IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    telefono_principal VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    ciudad VARCHAR(100) DEFAULT 'Manta',
    ocupacion VARCHAR(100),
    estado_civil VARCHAR(20),
    estado_paciente VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado_paciente IN ('ACTIVO', 'INACTIVO', 'ARCHIVADO')),
    observaciones_generales TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pacientes_cedula ON pacientes(cedula_identidad);
CREATE INDEX idx_pacientes_apellidos_nombres ON pacientes(apellidos, nombres);
CREATE INDEX idx_pacientes_usuario ON pacientes(usuario_id);

-- 2. Contactos de Emergencia
CREATE TABLE IF NOT EXISTS pacientes_contactos_emergencia (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contactos_paciente ON pacientes_contactos_emergencia(paciente_id);

-- 3. Antecedentes Médicos Generales (Anamnesis Base)
CREATE TABLE IF NOT EXISTS pacientes_antecedentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    hipertension BOOLEAN DEFAULT FALSE,
    diabetes BOOLEAN DEFAULT FALSE,
    alergias_medicamentos TEXT, -- e.g. Penicilina, Anestésicos
    alergias_otros TEXT,
    enfermedades_cardiacas BOOLEAN DEFAULT FALSE,
    problemas_coagulacion BOOLEAN DEFAULT FALSE,
    embarazo BOOLEAN DEFAULT FALSE,
    meses_embarazo INT,
    medicacion_actual TEXT,
    cirugias_previas TEXT,
    habitos_toxicos TEXT, -- Fuma, alcohol, etc.
    observaciones_medicas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers de actualización de timestamps
CREATE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_antecedentes_updated_at BEFORE UPDATE ON pacientes_antecedentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
