# Constructor de Automatizaciones - CREATIX CRM

El constructor de flujos de trabajo de CREATIX-CRM permite automatizar tareas comerciales y secuencias de marketing cuando ocurren determinados eventos en la plataforma.

## Disparadores (Triggers)

Los flujos se inician cuando ocurren los siguientes eventos de base de datos:
- **`company_created`**: Se crea una nueva empresa.
- **`contact_created`**: Se registra un nuevo contacto.
- **`list_added`**: Un contacto es agregado a una lista de segmentación.
- **`status_changed`**: Cambia el estado comercial de una empresa.
- **`stage_changed`**: Se mueve una oportunidad a otra etapa del pipeline Kanban.

---

## Acciones Soportadas

Cada flujo de automatización se define como una serie secuencial de pasos (`AutomationStep`):

1. **Enviar Correo (`email`)**: Despacha un correo utilizando una plantilla seleccionada.
2. **Esperar (`wait`)**: Pausa el flujo de ejecución del contacto durante un tiempo determinado (horas, días o semanas).
3. **Crear Tarea (`task`)**: Programa una tarea o llamada de seguimiento en la agenda del asesor comercial asignado.
4. **Asignar Asesor (`assign_agent`)**: Actualiza el asesor responsable de la cuenta.
5. **Cambiar Estado (`change_status`)**: Modifica el estado comercial (ej. cambiar a "Interesado" o "En Seguimiento").
6. **Agregar/Remover Etiqueta (`add_tag` / `remove_tag`)**: Modifica las etiquetas del perfil para re-segmentación.
7. **Agregar a Lista (`add_to_list`)**: Inscribe el contacto en otra lista estática.
8. **Crear Oportunidad (`create_opportunity`)**: Inserta un negocio comercial en el embudo Kanban de forma automática.

---

## Bucle de Ejecución y Cron Worker

Cuando un disparador es activado, se crea una instancia de ejecución en la colección `AutomationExecution` en estado `'running'`. El motor de automatizaciones ejecuta secuencialmente los pasos ordenados:

- Si encuentra un paso transaccional (ej. cambiar estado, agregar etiqueta), lo ejecuta inmediatamente y avanza al siguiente paso.
- Si encuentra un paso de espera (`'wait'`), el motor calcula la fecha futura de vencimiento (`nextExecuteAt`), cambia el estado de la ejecución a `'paused'` y detiene el procesamiento para ese contacto.

### Recuperación de Flujos Pausados:
Un proceso de fondo (cron worker) ejecuta periódicamente la rutina:
```typescript
pollPausedExecutions()
```
Esta consulta busca todos los registros en estado `'paused'` cuya fecha `nextExecuteAt` sea menor o igual al tiempo actual, cambia su estado a `'running'` y reanuda el bucle del motor desde la siguiente instrucción de manera transparente.
