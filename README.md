# CREATIX-CRM - SaaS Multiempresa B2B

CREATIX-CRM es un sistema de Gestión de Relaciones con Clientes (CRM) multi-tenant desarrollado sobre un stack de última generación utilizando Next.js 16 (App Router), React 19, MongoDB (con Mongoose) y Tailwind CSS v4.

Está diseñado para permitir a múltiples organizaciones independientes registrar prospectos comerciales, organizar sus procesos de ventas en un tablero Kanban, agendar actividades comerciales, y lanzar campañas masivas de correo electrónico con métricas de aperturas y clics en tiempo real.

---

## 🚀 Requisitos Previos

- **Node.js**: >= 18.x.x
- **NPM**: >= 9.x.x
- **MongoDB**: Instancia local o remota (Atlas) v6.0+
- **Resend** (Opcional): API Key válida para envíos masivos productivos.
- **SMTP** (Opcional): Servidor de correo saliente alternativo (Gmail, Outlook, etc.).

---

## 🛠️ Instalación y Configuración Local

1. Instalar las dependencias de producción y desarrollo:
   ```bash
   npm install
   ```

2. Crear un archivo de variables de entorno `.env.local` en la raíz del proyecto basándose en `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

3. Modificar las variables de entorno para ajustarlas a sus credenciales de MongoDB, NextAuth y proveedores de correo.

---

## 📋 Variables de Entorno (.env.example)

El archivo `.env.example` contiene las variables mínimas requeridas para el funcionamiento de la aplicación:

```env
# Aplicación
APP_URL=http://localhost:3000
PORT=3000

# Seguridad y Autenticación
AUTH_SECRET=algun_secreto_muy_seguro_de_32_caracteres
ENCRYPTION_KEY=clave_de_encriptacion_para_api_keys

# Base de Datos
MONGODB_URI=mongodb://127.0.0.1:27017/creatix_crm

# Proveedor de Correo Principal (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=re_webhook_secret_here

# Proveedor de Correo Alternativo (SMTP)
EMAIL_PROVIDER=smtp # resend | smtp
EMAIL_FROM="CREATIX CRM" <no-reply@creatix-crm.com>
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password

# Tareas en Segundo Plano (Cron)
CRON_SECRET=secreto_para_proteger_el_cron_webhook
```

---

## 💾 Sembrado de Datos de Prueba (Seed)

Para poblar la base de datos local con un conjunto completo de datos empresariales de prueba (usuarios de todos los roles, prospectos, negocios, actividades, plantillas, etc.), ejecute el siguiente comando:

```bash
npx tsx scripts/seed.ts
```

### 🔑 Credenciales Generadas por Defecto:

- **SUPER_ADMIN**: `admin@creatix-crm.com` / `AdminPassword123!`
- **Alfa OWNER**: `owner@alfa.com` / `UserPassword123!`
- **Alfa ASESOR**: `sales.agent@alfa.com` / `UserPassword123!`

---

## 🧪 Ejecución de Pruebas

Para ejecutar las pruebas de integración del sistema de aislamiento de datos, hashes de seguridad y validaciones de plan:

```bash
npx tsx scripts/run-tests.ts
```

---

## 📦 Despliegue en Producción

### 🐳 Opción A: Docker & Docker Compose
La aplicación incluye soporte nativo para despliegue contenerizado empaquetando la base de datos MongoDB, la aplicación standalone de Next.js y un proxy reverso Nginx para balanceo y caché.

1. Construir e iniciar los servicios en segundo plano:
   ```bash
   docker-compose up --build -d
   ```

2. Validar que los contenedores estén activos:
   ```bash
   docker ps
   ```

### ⚙️ Opción B: VPS con Ubuntu & PM2
Para desplegar directamente en una instancia VPS utilizando PM2 como gestor de procesos de Node.js:

1. Clonar el repositorio e instalar dependencias en el servidor.
2. Compilar la aplicación Next.js:
   ```bash
   npm run build
   ```
3. Iniciar el servidor Next.js usando PM2:
   ```bash
   pm2 start npm --name "creatix-crm" -- run start
   ```
4. Configurar PM2 para que se reinicie con el sistema:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 📂 Arquitectura del Proyecto

CREATIX-CRM implementa una arquitectura desacoplada para garantizar que la lógica de persistencia de datos y permisos no se filtre en la capa visual de React:

- **`src/models/`**: Esquemas e índices Mongoose. Implementan separación tenant con índices compuestos organizados alrededor de `organizationId`.
- **`src/server/permissions/`**: Validaciones basadas en roles y contexto del tenant. Toda acción debe validar que el `organizationId` provenga del JWT de sesión de NextAuth y no del cliente frontend.
- **`src/server/services/`**: Lógica pura del negocio: gestión de prospectos comerciales, drag & drop de negocios, segmentación dinámica de listas y disparos automáticos de flujos de trabajo.
- **`src/server/jobs/`**: Tareas asíncronas encargadas del envío de campañas por lotes y del control de esperas para flujos automatizados.
