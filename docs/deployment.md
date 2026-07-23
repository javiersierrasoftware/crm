# Guía de Despliegue en Producción - CREATIX CRM

CREATIX-CRM está optimizado para funcionar tanto en infraestructuras contenerizadas (Docker) como en servidores privados virtuales (VPS) con Node.js nativo.

## Opción 1: Despliegue con Docker Compose (Recomendado)

Esta alternativa levanta contenedores aislados para la aplicación, la base de datos MongoDB y Nginx como proxy reverso.

### Requisitos:
- Docker y Docker Compose instalados en el servidor.
- Puertos 80 y 443 libres.

### Pasos:
1. Copie el repositorio al servidor y configure el archivo `.env.local` con las credenciales de producción.
2. Asegúrese de que el archivo `nginx.conf` de la raíz del proyecto tenga el nombre de dominio configurado.
3. Levante la suite completa:
   ```bash
   docker-compose up --build -d
   ```
4. Verifique el estado de salud de la aplicación accediendo al endpoint diagnóstico:
   `http://su-dominio.com/api/health`

---

## Opción 2: VPS Ubuntu Directo con PM2

Esta opción es ideal para entornos que ejecutan múltiples servicios de Node.js o que desean evitar el consumo de memoria de Docker.

### 1. Instalación de Node.js y MongoDB
En el servidor VPS Ubuntu, instale Node.js v18+ y el motor MongoDB Community Server. Asegúrese de iniciar y habilitar el servicio de la base de datos:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Configurar la Aplicación
1. Instale las dependencias de producción:
   ```bash
   npm install --omit=dev
   ```
2. Configure las variables de entorno en un archivo `.env.local`.
3. Compile la aplicación Next.js standalone:
   ```bash
   npm run build
   ```

### 3. Ejecución de Procesos con PM2
Instale PM2 globalmente e inicie el servidor de Next.js:
```bash
sudo npm install -g pm2
pm2 start npm --name "creatix-crm" -- run start
```
Configure PM2 para que se ejecute al reiniciar el servidor físico:
```bash
pm2 startup
# Ejecute el comando que le sugiera la consola
pm2 save
```

### 4. Configurar Nginx local como Proxy Reverso
Copie las reglas de redirección de `nginx.conf` a la configuración de Nginx del sistema (`/etc/nginx/sites-available/default`) y reinicie Nginx:
```bash
sudo systemctl restart nginx
```
Use **Certbot** para obtener certificados SSL gratuitos de Let's Encrypt para su dominio de producción:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d su-dominio.com
```
