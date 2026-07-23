# Seguridad y Aislamiento - CREATIX CRM

CREATIX-CRM se ha desarrollado bajo un modelo de **Defensa en Capas** para garantizar la confidencialidad de los datos de cada cliente y proteger el sistema frente a ataques cibernéticos comunes.

## 🛡️ Aislamiento Estricto de Datos (Multi-tenancy)

El riesgo más crítico en una aplicación SaaS es la fuga de información entre inquilinos. CREATIX-CRM previene esto mediante:

1. **Aislamiento en Servidor**: El identificador de la organización (`organizationId`) nunca es aceptado como parámetro directo de los formularios enviados desde el cliente frontend. En su lugar, el servidor obtiene y valida la organización activa del usuario directamente de la firma criptográfica de la sesión (`auth()` de NextAuth v5).
2. **Índices de Aislamiento**: Todas las consultas a las colecciones de negocio (`Company`, `Contact`, `Opportunity`, etc.) incluyen de forma mandatoria la clave `{ organizationId }` en la raíz del filtro de MongoDB.
3. **Validación de Relaciones Cruzadas**: Cuando se crea una actividad o negocio vinculado a una empresa o contacto, el servicio realiza una verificación preventiva en base de datos para asegurar que los IDs de la empresa y contacto relacionados pertenezcan efectivamente al mismo `organizationId` del inquilino, bloqueando manipulaciones de IDs por API.

---

## 🔒 Autenticación y Criptografía

- **Protección de Contraseñas**: Las contraseñas son codificadas utilizando `bcryptjs` con un factor de trabajo de 10 rondas antes de almacenarse en base de datos.
- **Protección de Rutas**: Un middleware centralizado en Edge intercepta todas las rutas privadas de la aplicación y redirige a los usuarios no autenticados a la pantalla de Login de forma automática.
- **Auditoría de Acciones Críticas**: El servicio `writeAuditLog` registra de forma persistente eventos de seguridad como inicios de sesión, cambios de plan, descargas de reportes, actualizaciones de usuarios e impersonaciones administrativas.

---

## 💻 Mitigación de Vulnerabilidades Web

### 1. Inyección de Consultas (MongoDB Injection)
Dado que utilizamos esquemas y modelos fuertemente tipados a través de Mongoose, los parámetros de entrada son filtrados y formateados según el tipo definido (ej. mapeo estricto a `mongoose.Types.ObjectId`), evitando que usuarios maliciosos inyecten objetos query en los filtros de base de datos.

### 2. Inyección de Código (Cross-Site Scripting - XSS)
Para el envío de campañas de correo electrónico que permiten el uso de variables dinámicas (como `{{contact.firstName}}`), CREATIX-CRM implementa un motor de escape de caracteres HTML que reemplaza de forma preventiva caracteres como `<`, `>`, `&`, `"`, `'` por sus entidades seguras de HTML, evitando la ejecución de código script malicioso en el lector de correo del destinatario.
