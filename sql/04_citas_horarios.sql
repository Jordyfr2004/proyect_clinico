-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 04_citas_horarios.sql - Agenda, Disponibilidad, Citas, QR Check-in y Lista de Espera
-- ==============================================================================

-- 1. Horarios de Configuración de Atención Clínica
CREATE TABLE IF NOT EXISTS horarios_atencion (
    id SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=Lunes, 7=Domingo
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    duracion_slot_minutos INT DEFAULT 30 NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horas CHECK (hora_cierre > hora_apertura)
);

-- 2. Bloqueos o Excepciones de Horario (Feriados, Vacaciones, Emergencias)
CREATE TABLE IF NOT EXISTS horarios_excepciones (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    motivo VARCHAR(255) NOT NULL,
    bloqueo_completo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Principal de Citas Médicas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    motivo_consulta VARCHAR(255) NOT NULL,
    estado VARCHAR(30) DEFAULT 'PENDIENTE' CHECK (
        estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_SALA_ESPERA', 'EN_CONSULTA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO', 'REPROGRAMADA')
    ),
    origen VARCHAR(20) DEFAULT 'WEB' CHECK (origen IN ('WEB', 'MOVIL', 'PRESENCIAL')),
    
    -- Check-in mediante QR
    codigo_checkin_qr VARCHAR(100) UNIQUE,
    checkin_completado_at TIMESTAMP WITH TIME ZONE,
    
    notas_asistente TEXT,
    notas_cancelacion TEXT,
    cancelada_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_duracion_cita CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_citas_fecha_hora ON citas(fecha, hora_inicio);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
CREATE INDEX idx_citas_doctor ON citas(doctor_id);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_checkin_qr ON citas(codigo_checkin_qr);

-- 4. Historial de Cambios / Reprogramaciones de Citas
CREATE TABLE IF NOT EXISTS citas_historial_cambios (
    id SERIAL PRIMARY KEY,
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    fecha_anterior DATE,
    hora_anterior TIME,
    fecha_nueva DATE,
    hora_nueva TIME,
    motivo_cambio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_cita ON citas_historial_cambios(cita_id);

-- 5. Lista de Espera Inteligente para Disponibilidad de Citas
CREATE TABLE IF NOT EXISTS lista_espera (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    fecha_preferida DATE NOT NULL,
    rango_horario_inicio TIME,
    rango_horario_fin TIME,
    motivo VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'NOTIFICADA', 'AGENDADA', 'CANCELADA', 'EXPIRADA')),
    notificado_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lista_espera_fecha ON lista_espera(fecha_preferida);
CREATE INDEX idx_lista_espera_estado ON lista_espera(estado);

-- Triggers de actualización de timestamps
CREATE TRIGGER trg_horarios_updated_at BEFORE UPDATE ON horarios_atencion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_citas_updated_at BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_lista_espera_updated_at BEFORE UPDATE ON lista_espera FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
