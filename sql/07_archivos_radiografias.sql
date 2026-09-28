-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 07_archivos_radiografias.sql - Gestión de Documentos, Radiografías y File Server (Laptop 5)
-- ==============================================================================

-- 1. Tabla de Archivos Clínicos y Multimedia (Enlace con Servidor de Archivos Laptop 5)
CREATE TABLE IF NOT EXISTS archivos_clinicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    subido_por_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    categoria VARCHAR(40) NOT NULL CHECK (
        categoria IN (
            'RADIOGRAFIA_PANORAMICA',
            'RADIOGRAFIA_PERIAPICAL',
            'FOTO_INTRAORAL',
            'FOTO_EXTRAORAL',
            'CONSENTIMIENTO_INFORMADO',
            'ESTUDIO_LABORATORIO',
            'DOCUMENTO_PACIENTE',
            'OTRO'
        )
    ),
    
    nombre_archivo_original VARCHAR(255) NOT NULL,
    nombre_guardado VARCHAR(255) NOT NULL,
    ruta_servidor_archivos VARCHAR(500) NOT NULL, -- Ruta relativa en Laptop 5 (File Server)
    url_acceso_publico VARCHAR(500),              -- URL generada a través del Load Balancer / File Server
    tipo_mime VARCHAR(100) NOT NULL,              -- e.g. 'image/png', 'image/jpeg', 'application/pdf'
    peso_bytes BIGINT NOT NULL,
    hash_sha256 VARCHAR(64),                      -- Para verificación de integridad
    
    pieza_dental_num INT,                         -- Opcional, si la radiografía es de una pieza dental específica
    descripcion_clinica TEXT,
    cargado_desde VARCHAR(20) DEFAULT 'WEB' CHECK (cargado_desde IN ('WEB', 'MOVIL')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_archivos_paciente ON archivos_clinicos(paciente_id);
CREATE INDEX idx_archivos_categoria ON archivos_clinicos(categoria);
CREATE INDEX idx_archivos_fecha ON archivos_clinicos(created_at DESC);

-- Trigger de actualización
CREATE TRIGGER trg_archivos_updated_at BEFORE UPDATE ON archivos_clinicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
