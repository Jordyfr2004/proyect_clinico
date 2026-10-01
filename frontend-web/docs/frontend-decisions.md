# Decisiones del frontend web

## 2026-09-27

- No usar datos simulados como sustituto de integraciones reales. Las funciones sin contrato de backend permanecen pendientes de integración.
- Retirar provisionalmente Inventario: no aparece en el alcance funcional inicial validado para la aplicación web en el PDF.
- Representar respuestas HTTP 403 con un aviso descartable; una operación denegada no debe bloquear permanentemente toda la aplicación.
- Mantener accesibilidad básica en la navegación móvil: `aria-expanded` refleja su estado y Escape cierra el menú.
- Mantener el frontend separado del backend, la base de datos y la aplicación móvil; la comunicación con datos y archivos pasa por la API del sistema.

## 2026-09-28

- El registro público corresponde únicamente a clientes, sin selector de rol. La doctora será la única superadmin y creará a los asistentes desde el área administrativa. La integración del registro queda pendiente hasta confirmar el contrato del backend.

## 2026-09-30

- El backend confirmó que el inicio de sesión utiliza `username`: la doctora usa su nombre de usuario y los pacientes pueden usar su cédula. La autenticación emplea tokens Bearer de Laravel Sanctum. El frontend envía el token en `Authorization` y conserva únicamente el `access_token` en `sessionStorage`, de forma provisional para esta V1; el usuario se reconstruye con `GET /user`.

## 2026-10-01

- El backend contempla una única cuenta de asistente. Su gestión en Usuarios consume exclusivamente los endpoints confirmados de consulta, creación, activación, desactivación y cambio de contraseña, bajo el acceso de doctora. Un GET 404 indica que aún no existe la cuenta y habilita su creación; no se muestran datos ni acciones ficticios.
- La recuperación de contraseña permanece pendiente de integración. Una sesión ya autenticada regresa al Dashboard desde esa ruta pública.
- El registro público de pacientes consume el contrato verificado de `POST /auth/register-paciente` y acepta la sesión con la infraestructura existente. El listado y detalle básico de pacientes y el perfil propio solo muestran respuestas validadas del backend. Estos flujos están cubiertos por pruebas automatizadas; su prueba extremo a extremo queda pendiente de Laravel disponible.
- La integración de `POST /pacientes` se mantuvo bloqueada mientras Request y Controller usaban `nombre` y el modelo usaba `nombres`. En `origin/backend` `60b3e13f81c9cfe5dc4e400085a61186ca67d925`, los tres usan `nombres`; se habilitó el registro administrativo con pruebas automatizadas. La prueba extremo a extremo autenticada sigue pendiente de una sesión real. La edición PUT continúa pendiente porque `PacienteController::update()` no está implementado; tampoco se conectan módulos con respuestas placeholder.
