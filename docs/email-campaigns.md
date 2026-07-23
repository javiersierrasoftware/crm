# Campañas de Correo y Métricas - CREATIX CRM

El módulo de email marketing de CREATIX-CRM permite el envío masivo de correos electrónicos transaccionales y publicitarios a listas segmentadas.

## Flujo de Envío de Campaña

1. **Creación del Borrador**: El usuario con rol `MARKETING`, `ADMIN` u `OWNER` define el remitente, el asunto, la plantilla HTML y la lista de destino.
2. **Evaluación de Exclusiones (Cumplimiento GDPR/Ley de Datos)**:
   - Se recupera la lista de destinatarios.
   - Se excluyen contactos que no tengan `commercialConsent = true`.
   - Se cruza la lista con la tabla `Unsubscribe` (supresiones por desuscripción previa, rebotes permanentes anteriores o quejas de spam).
3. **Verificación de Límites**: El sistema consulta si el envío proyectado excede la cuota restante mensual del plan contratado. Si se excede, se cancela el envío y se emite una alerta.
4. **Desacoplamiento y Despacho**: La campaña cambia a estado `'sending'` y delega el bucle de envío a un proceso asíncrono utilizando `setTimeout` o colas de trabajo para liberar el hilo web.

---

## 📈 Sistema de Métricas y Tracking

CREATIX-CRM implementa un sistema automático para recolectar el rendimiento de la campaña:

### 1. Aperturas (Open Tracking Pixel)
Antes de enviar el correo, el renderizador inyecta una imagen invisible de 1x1 píxeles al final del cuerpo HTML:
```html
<img src="https://creatix-crm.com/api/tracking/open?recipientId=OBJECT_ID" width="1" height="1" style="display:none;" />
```
Cuando el cliente de correo del destinatario descarga la imagen, el Route Handler `/api/tracking/open` intercepta la petición, verifica si es la primera apertura de ese destinatario, registra el evento `'open'` y actualiza el contador de aperturas únicas de la campaña.

### 2. Clics (Link Rewriting)
El despachador reescribe automáticamente los enlaces absolutos encontrados en el cuerpo HTML de la plantilla (ej. redireccionando a través del Route Handler `/api/tracking/click`):
```html
<!-- Antes -->
<a href="https://miempresa.com/oferta">Ver Oferta</a>

<!-- Después -->
<a href="https://creatix-crm.com/api/tracking/click?recipientId=OBJECT_ID&url=https%3A%2F%2Fmiempresa.com%2Foferta">Ver Oferta</a>
```
Al hacer clic, se almacena el evento de clic en la base de datos y se redirige inmediatamente al usuario a su destino original con una respuesta HTTP 302.

### 3. Cancelación de Suscripción (Unsubscribe)
Todos los correos masivos contienen por ley un enlace de desuscripción obligatoria:
```html
<a href="https://creatix-crm.com/api/unsubscribe?email=correo@cliente.com&org=ORG_ID&camp=CAMP_ID">Darse de baja</a>
```
Al hacer clic en este enlace, el Route Handler agrega la dirección de correo a la tabla de exclusión `Unsubscribe` y actualiza el perfil del contacto a `subscriptionStatus = 'unsubscribed'`, bloqueando futuros envíos de manera irrevocable incluso si el contacto se vuelve a importar mediante archivos CSV.
