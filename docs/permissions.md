# Gestión de Roles y Permisos - CREATIX CRM

CREATIX-CRM implementa un control de acceso basado en roles (RBAC) estructurado en dos niveles: **Roles de Plataforma** y **Roles de Inquilino**.

## Roles de Plataforma

### SUPER_ADMIN
Es un rol global del sistema que no está restringido a una sola organización.
- **Acciones**: Puede crear inquilinos, cambiar planes, suspender o reactivar empresas, auditar logs globales e impersonar cuentas de inquilinos con fines de soporte técnico (todas las impersonaciones quedan registradas con auditoría obligatoria).

---

## Roles de Inquilino (Multi-tenant)

Viculan al usuario con una organización específica mediante la colección `OrganizationMember`:

| Rol | Descripción | Permisos Clave |
| :--- | :--- | :--- |
| **OWNER** | Propietario de la organización | Acceso total a facturación, borrado de organización, invitación de administradores y configuraciones avanzadas. |
| **ADMIN** | Administrador de la organización | Gestión operativa completa: usuarios, etiquetas, integraciones y flujos. No puede eliminar la cuenta de la organización ni alterar la facturación de nivel OWNER. |
| **SALES_MANAGER** | Director Comercial | Supervisa las tareas del equipo, asigna leads a asesores, configura embudos comerciales y tiene acceso completo a reportes de conversión. |
| **SALES_AGENT** | Asesor Comercial | Gestión de prospectos y negocios asignados. Puede agendar llamadas, registrar notas de reuniones y actualizar etapas de oportunidades. |
| **MARKETING** | Especialista de Marketing | Creación y administración de plantillas de correo, segmentación de listas y envío de campañas publicitarias masivas. |
| **VIEWER** | Visualizador de Lectura | Acceso restringido en modo solo lectura a las pantallas comerciales permitidas de la organización. |

---

## Verificación de Permisos en Servidor

Toda acción en el servidor (Server Actions o API Route Handlers) debe interceptar al actor mediante el wrapper `assertRole` de `src/server/permissions/tenant.ts`:

```typescript
// Ejemplo de restricción de borrado para dueños y administradores
const context = await assertRole(['OWNER', 'ADMIN']);
const organizationId = context.organizationId;
```
Este diseño garantiza que no se puedan inyectar IDs de otras organizaciones o realizar peticiones comerciales sin privilegios.
