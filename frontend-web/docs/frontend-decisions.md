# Decisiones del frontend web

## 2026-09-27

- No usar datos simulados como sustituto de integraciones reales. Las funciones sin contrato de backend permanecen pendientes de integración.
- Retirar provisionalmente Inventario: no aparece en el alcance funcional inicial validado para la aplicación web en el PDF.
- Representar respuestas HTTP 403 con un aviso descartable; una operación denegada no debe bloquear permanentemente toda la aplicación.
- Mantener accesibilidad básica en la navegación móvil: `aria-expanded` refleja su estado y Escape cierra el menú.
- Mantener el frontend separado del backend, la base de datos y la aplicación móvil; la comunicación con datos y archivos pasa por la API del sistema.

## 2026-09-28

- El registro público corresponde únicamente a clientes, sin selector de rol. La doctora será la única superadmin y creará a los asistentes desde el área administrativa. La integración del registro queda pendiente hasta confirmar el contrato del backend.
