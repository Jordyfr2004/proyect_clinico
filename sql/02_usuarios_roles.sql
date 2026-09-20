-- ==============================================================================
-- SISTEMA DE GESTIÓN PARA CONSULTORIO ODONTOLÓGICO - ULEAM 2026
-- NODO: LAPTOP 4 (Servidor de Base de Datos PostgreSQL)
-- 02_usuarios_roles.sql - Gestión de Seguridad, Usuarios, Roles y Sesiones
-- ==============================================================================

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'DOCTORA', 'ASISTENTE', 'PACIENTE'
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Permisos
CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL, -- ej. 'citas.crear', 'pacientes.ver', 'odontograma.editar'
    modulo VARCHAR(50) NOT NULL,        -- 'CITAS', 'PACIENTES', 'ODONTOGRAMA', 'FINANZAS', etc.
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Intermedia Rol - Permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- 4. Tabla de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    foto_perfil_url VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    email_verificado_at TIMESTAMP WITH TIME ZONE,
    ultimo_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

-- 5. Sesiones y Tokens de Dispositivos (Soporte Web y Móvil)
CREATE TABLE IF NOT EXISTS sesiones_dispositivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    plataforma VARCHAR(20) NOT NULL CHECK (plataforma IN ('WEB', 'ANDROID', 'IOS')),
    dispositivo_nombre VARCHAR(100),
    fcm_push_token TEXT, -- Para notificaciones push móviles
    ip_origen VARCHAR(45),
    ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sesiones_usuario ON sesiones_dispositivos(usuario_id);

-- 6. Vinculación de Cuenta de Paciente con Aplicación Móvil
CREATE TABLE IF NOT EXISTS vinculaciones_movil (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_verificacion VARCHAR(10) NOT NULL,
    qr_payload TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'VINCULADO', 'EXPIRADO', 'RECHAZADO')),
    dispositivo_info TEXT,
    vinculado_at TIMESTAMP WITH TIME ZONE,
    expira_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vinculaciones_usuario ON vinculaciones_movil(usuario_id);
CREATE INDEX idx_vinculaciones_estado ON vinculaciones_movil(estado);

-- Triggers de actualización de timestamps
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_vinculaciones_updated_at BEFORE UPDATE ON vinculaciones_movil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
