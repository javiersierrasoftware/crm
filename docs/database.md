# Diseño de Base de Datos - CREATIX CRM

CREATIX-CRM utiliza MongoDB como base de datos no relacional de alto rendimiento, gestionada mediante Mongoose.

## Estrategia Multiempresa (Multi-tenancy)

Todos los documentos de negocio están indexados y vinculados a una organización mediante el campo:
```typescript
organizationId: Schema.Types.ObjectId // Referencia a la colección Organization
```

Para asegurar que las consultas entre empresas estén completamente aisladas y tengan un rendimiento de orden constante, se definen **índices compuestos**:

- **Company**: `{ organizationId: 1, deletedAt: 1, commercialStatus: 1 }`
- **Contact**: `{ organizationId: 1, email: 1 }` (Búsqueda única de contactos por correo dentro de una organización)
- **Unsubscribe**: `{ organizationId: 1, email: 1 }` (Único para lista de exclusión)
- **Opportunity**: `{ organizationId: 1, pipelineId: 1, stageId: 1 }`

## Modelos Principales

### 1. User
Almacena la cuenta global del usuario. Puede participar en múltiples organizaciones.
- `isSuperAdmin` define el acceso administrativo total a la plataforma CREATIX.

### 2. Organization
Almacena la información del inquilino (nombre, datos tributarios, logo y estado).

### 3. OrganizationMember
Colección intermedia (n-n) que vincula un `userId` a un `organizationId` con un rol determinado (`OWNER`, `ADMIN`, `SALES_MANAGER`, `SALES_AGENT`, `MARKETING`, `VIEWER`).

### 4. Company & Contact
Estructura central de la agenda de prospectos comerciales.
- Una empresa (`Company`) puede poseer múltiples contactos (`Contact`).
- Ambos modelos implementan **Borrado Suave (Soft Delete)** a través del campo `deletedAt`. Si un registro es eliminado, este campo almacena la fecha de baja y es omitido automáticamente en todas las consultas del panel comercial, pero los datos históricos permanecen en base de datos.

### 5. Pipeline & Opportunity
Modelos encargados del embudo comercial Kanban.
- Las etapas (`PipelineStage`) se definen como un subdocumento embebido dentro del modelo `Pipeline` para reducir las consultas cruzadas y facilitar el reordenamiento optimista de etapas en el cliente.
- Las oportunidades (`Opportunity`) referencian la etapa correspondiente por su ObjectId interno.

### 6. EmailTemplate & Campaign
Módulo de marketing por correo.
- `EmailTemplate` guarda plantillas HTML y variables dinámicas.
- `Campaign` e `CampaignRecipient` registran y auditan el progreso de los envíos masivos.
