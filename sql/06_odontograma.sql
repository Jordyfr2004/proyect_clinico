-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 06_odontograma.sql - Odontograma Digital Profesional (Notación FDI/ISO)
-- ==============================================================================

-- 1. Catálogo Maestro de Piezas Dentales (FDI / ISO 3950)
CREATE TABLE IF NOT EXISTS piezas_dentales (
    id SERIAL PRIMARY KEY,
    numero_fdi INT UNIQUE NOT NULL, -- 11 a 48 (permanentes) y 51 a 85 (temporales)
    tipo_denticion VARCHAR(20) NOT NULL CHECK (tipo_denticion IN ('PERMANENTE', 'TEMPORAL')),
    cuadrante INT NOT NULL CHECK (cuadrante BETWEEN 1 AND 8),
    nombre_pieza VARCHAR(100) NOT NULL
);

-- 2. Catálogo de Condiciones / Estados del Odontograma
CREATE TABLE IF NOT EXISTS catalogo_condiciones_dentales (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL, -- 'CARIES', 'OBTURACION_RESINA', 'CORONA', 'ENDODONCIA', 'AUSENTE', 'IMPLANTE', 'SELLANTE'
    nombre VARCHAR(100) NOT NULL,
    color_hex VARCHAR(10) NOT NULL,    -- '#FF0000' (Rojo=Patología), '#0055FF' (Azul=Realizado), etc.
    aplica_a_superficie BOOLEAN DEFAULT TRUE,
    aplica_a_pieza_completa BOOLEAN DEFAULT FALSE,
    descripcion TEXT
);

-- 3. Encabezado de Odontograma (Evolución y Línea de Tiempo por Paciente)
CREATE TABLE IF NOT EXISTS odontogramas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    tipo_odontograma VARCHAR(30) DEFAULT 'EVOLUCION' CHECK (tipo_odontograma IN ('INICIAL', 'EVOLUCION', 'FINAL')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observaciones_generales TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_odontograma_paciente ON odontogramas(paciente_id, fecha_registro DESC);

-- 4. Estado General de la Pieza Dental en un Odontograma
CREATE TABLE IF NOT EXISTS odontograma_piezas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    odontograma_id UUID NOT NULL REFERENCES odontogramas(id) ON DELETE CASCADE,
    pieza_dental_id INT NOT NULL REFERENCES piezas_dentales(id) ON DELETE RESTRICT,
    condicion_general_id INT REFERENCES catalogo_condiciones_dentales(id) ON DELETE SET NULL,
    es_ausente BOOLEAN DEFAULT FALSE,
    tiene_endodoncia BOOLEAN DEFAULT FALSE,
    tiene_protesis BOOLEAN DEFAULT FALSE,
    tiene_implante BOOLEAN DEFAULT FALSE,
    notas_pieza TEXT,
    CONSTRAINT uq_odontograma_pieza UNIQUE (odontograma_id, pieza_dental_id)
);

CREATE INDEX idx_odo_piezas_odontograma ON odontograma_piezas(odontograma_id);

-- 5. Estado de Superficies / Caras Dentales
CREATE TABLE IF NOT EXISTS odontograma_superficies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    odontograma_pieza_id UUID NOT NULL REFERENCES odontograma_piezas(id) ON DELETE CASCADE,
    superficie VARCHAR(20) NOT NULL CHECK (
        superficie IN ('VESTIBULAR', 'LINGUAL_PALATINA', 'MESIAL', 'DISTAL', 'OCLUSAL_INCISAL', 'CERVICAL')
    ),
    condicion_id INT NOT NULL REFERENCES catalogo_condiciones_dentales(id) ON DELETE RESTRICT,
    CONSTRAINT uq_odo_superficie UNIQUE (odontograma_pieza_id, superficie)
);

CREATE INDEX idx_odo_superficies_pieza ON odontograma_superficies(odontograma_pieza_id);

-- Trigger de actualización
CREATE TRIGGER trg_odontogramas_updated_at BEFORE UPDATE ON odontogramas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
