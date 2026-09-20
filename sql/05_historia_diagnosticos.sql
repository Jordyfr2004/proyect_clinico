-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 05_historia_diagnosticos.sql - Historia Clínica, Diagnósticos y Tratamientos
-- ==============================================================================

-- 1. Historia Clínica Principal del Paciente
CREATE TABLE IF NOT EXISTS historias_clinicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    numero_expediente VARCHAR(50) UNIQUE NOT NULL,
    motivo_primera_consulta TEXT,
    antecedentes_odontologicos TEXT,
    habitos_higiene_bucal TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historia_paciente ON historias_clinicas(paciente_id);

-- 2. Notas de Evolución Clínica (Línea de Tiempo del Historial)
CREATE TABLE IF NOT EXISTS notas_evolucion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    historia_clinica_id UUID NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_atencion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subjetivo TEXT, -- Síntomas referidos por el paciente
    objetivo TEXT,   -- Hallazgos clínicos / exploración física
    analisis TEXT,   -- Interpretación médica
    plan_accion TEXT,-- Tratamiento indicado / próximos pasos
    signos_vitales JSONB, -- Presión arterial, pulso, temperatura opcional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notas_historia_fecha ON notas_evolucion(historia_clinica_id, fecha_atencion DESC);

-- 3. Catálogo de Diagnósticos (Basado en CIE-10 / Odontología)
CREATE TABLE IF NOT EXISTS catalogo_diagnosticos (
    id SERIAL PRIMARY KEY,
    codigo_cie VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100), -- Caries, Periodoncia, Endodoncia, Ortodoncia, Cirugía, etc.
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- 4. Diagnósticos Registrados por Paciente
CREATE TABLE IF NOT EXISTS diagnosticos_paciente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    historia_clinica_id UUID NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    diagnostico_catalogo_id INT NOT NULL REFERENCES catalogo_diagnosticos(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    pieza_dental_num INT, -- Opcional, si el diagnóstico es sobre una pieza específica
    tipo_diagnostico VARCHAR(30) DEFAULT 'PRESUNTIVO' CHECK (tipo_diagnostico IN ('PRESUNTIVO', 'DEFINITIVO')),
    observaciones TEXT,
    fecha_diagnostico DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diag_historia ON diagnosticos_paciente(historia_clinica_id);

-- 5. Catálogo de Procedimientos / Tratamientos Odontológicos
CREATE TABLE IF NOT EXISTS catalogo_procedimientos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    costo_base NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duracion_estimada_min INT DEFAULT 30,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- 6. Planes de Tratamiento Globales del Paciente
CREATE TABLE IF NOT EXISTS planes_tratamiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    historia_clinica_id UUID NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    costo_total_estimado NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    descuento NUMERIC(10, 2) DEFAULT 0.00,
    costo_final NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) DEFAULT 'PROPUESTO' CHECK (
        estado IN ('PROPUESTO', 'ACEPTADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO')
    ),
    fecha_propuesta DATE DEFAULT CURRENT_DATE NOT NULL,
    fecha_aprobacion DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_planes_historia ON planes_tratamiento(historia_clinica_id);
CREATE INDEX idx_planes_estado ON planes_tratamiento(estado);

-- 7. Detalle de Tratamientos / Procedimientos por Sesión
CREATE TABLE IF NOT EXISTS tratamientos_detalle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_tratamiento_id UUID NOT NULL REFERENCES planes_tratamiento(id) ON DELETE CASCADE,
    procedimiento_id INT NOT NULL REFERENCES catalogo_procedimientos(id) ON DELETE RESTRICT,
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    pieza_dental_num INT,
    superficie_dental VARCHAR(20),
    costo NUMERIC(10, 2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'PLANIFICADO' CHECK (
        estado IN ('PLANIFICADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO')
    ),
    fecha_ejecucion DATE,
    observaciones_clinicas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tratamientos_plan ON tratamientos_detalle(plan_tratamiento_id);
CREATE INDEX idx_tratamientos_estado ON tratamientos_detalle(estado);

-- Triggers de actualización de timestamps
CREATE TRIGGER trg_historias_updated_at BEFORE UPDATE ON historias_clinicas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notas_updated_at BEFORE UPDATE ON notas_evolucion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_planes_updated_at BEFORE UPDATE ON planes_tratamiento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tratamientos_detalle_updated_at BEFORE UPDATE ON tratamientos_detalle FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
