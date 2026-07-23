import { Automation, AutomationExecution, AutomationExecutionLog } from '@/models/Automation';
import Contact from '@/models/Contact';
import Company from '@/models/Company';
import Activity from '@/models/Activity';
import { Opportunity } from '@/models/Opportunity';
import { addContactsToList } from './listService';
import { sendMail } from '../email/sender';
import EmailTemplate from '@/models/EmailTemplate';
import { renderTemplate } from './templateService';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { automationSchema } from '@/schemas/automation';
import mongoose from 'mongoose';

/**
 * Creates a new automation workflow.
 */
export async function createAutomation(data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = automationSchema.parse(data);

  const workflow = new Automation({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  const saved = await workflow.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_automation',
    entityType: 'Automation',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, trigger: saved.triggerType },
  });

  return saved;
}

export async function getAutomations() {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  return await Automation.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ createdAt: -1 });
}

export async function deleteAutomation(id: string) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const workflow = await Automation.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!workflow) throw new Error('Automatización no encontrada');

  await Automation.deleteOne({ _id: id });
  await AutomationExecution.deleteMany({ automationId: id });

  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_automation',
    entityType: 'Automation',
    entityId: workflow._id as mongoose.Types.ObjectId,
    details: { name: workflow.name },
  });
}

/**
 * Entry point to trigger workflow executions from client actions.
 */
export async function triggerAutomation(
  triggerType: 'company_created' | 'contact_created' | 'list_added' | 'status_changed' | 'stage_changed',
  payload: {
    organizationId: string;
    contactId: string;
    companyId?: string;
    targetValue?: string; // E.g., status key or stage ID
  }
) {
  try {
    // 1. Fetch active workflows for this trigger and tenant
    const workflows = await Automation.find({
      organizationId: new mongoose.Types.ObjectId(payload.organizationId),
      triggerType,
      status: 'active',
    });

    for (const workflow of workflows) {
      // If list_added, verify listId match in configuration
      if (triggerType === 'list_added' && workflow.triggerConfig?.listId) {
        if (workflow.triggerConfig.listId !== payload.targetValue) {
          continue; // Skip if targeting a different segment list
        }
      }

      // 2. Instantiate workflow execution
      const execution = new AutomationExecution({
        organizationId: workflow.organizationId,
        automationId: workflow._id,
        contactId: new mongoose.Types.ObjectId(payload.contactId),
        companyId: payload.companyId ? new mongoose.Types.ObjectId(payload.companyId) : null,
        currentStepIndex: 0,
        status: 'running',
        nextExecuteAt: new Date(),
      });

      const savedExec = await execution.save();

      // Launch async step dispatcher
      setTimeout(() => {
        executeWorkflowStep(savedExec._id.toString());
      }, 10);
    }
  } catch (error) {
    console.error('Trigger automation processing failed:', error);
  }
}

/**
 * Worker execution loop for a specific workflow execution step.
 */
export async function executeWorkflowStep(executionId: string) {
  const execution = await AutomationExecution.findById(executionId);
  if (!execution || execution.status !== 'running') return;

  const workflow = await Automation.findById(execution.automationId);
  if (!workflow || workflow.status !== 'active') {
    execution.status = 'failed';
    await execution.save();
    return;
  }

  const steps = workflow.steps || [];
  if (execution.currentStepIndex >= steps.length) {
    execution.status = 'completed';
    await execution.save();
    return;
  }

  // Get current active step
  const step = steps.find((s) => s.order === execution.currentStepIndex);
  if (!step) {
    execution.status = 'completed';
    await execution.save();
    return;
  }

  const organizationId = execution.organizationId.toString();
  const contactId = execution.contactId;
  const companyId = execution.companyId;

  try {
    let continueWorkflow = true;

    // Execute actions based on type
    switch (step.type) {
      case 'email': {
        const templateId = step.config.templateId;
        const contact = await Contact.findById(contactId).populate('companyId');
        const template = await EmailTemplate.findById(templateId);

        if (contact && template && contact.subscriptionStatus === 'subscribed') {
          // Resolve standard dynamic variables
          const appUrl = process.env.APP_URL || 'http://localhost:3000';
          const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(
            contact.email
          )}&org=${organizationId}`;

          const companyObj = contact.companyId as any;

          const variables = {
            'contact.firstName': contact.firstName,
            'contact.lastName': contact.lastName,
            'contact.email': contact.email,
            'contact.position': contact.position || '',
            'company.name': companyObj?.commercialName || 'su empresa',
            'company.city': companyObj?.city || 'su localidad',
            'organization.name': 'CREATIX Client',
            'sender.name': step.config.senderName || 'Asesor Comercial',
            'sender.email': step.config.senderEmail || 'no-reply@creatix-crm.com',
            unsubscribeUrl: unsubUrl,
          };

          const html = renderTemplate(template.bodyHtml, variables);
          const text = renderTemplate(template.bodyText || '', variables);

          await sendMail({
            to: contact.email,
            subject: renderTemplate(template.subject, variables),
            html,
            text,
            fromName: step.config.senderName || 'Asesor Comercial',
            fromEmail: step.config.senderEmail || 'no-reply@creatix-crm.com',
            orgId: organizationId,
          });
        }
        break;
      }

      case 'wait': {
        const delaySeconds = Number(step.config.delaySeconds) || 60; // default 1 minute
        execution.status = 'paused';
        execution.nextExecuteAt = new Date(Date.now() + delaySeconds * 1000);
        continueWorkflow = false; // Halt execution loop until next time interval
        break;
      }

      case 'task': {
        const title = step.config.title || 'Tarea Automatizada';
        const desc = step.config.description || '';
        const priority = step.config.priority || 'medium';

        await Activity.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          title,
          description: desc,
          type: 'task',
          date: new Date(),
          priority,
          status: 'pending',
          contactId,
          companyId,
          reminderSent: false,
        });
        break;
      }

      case 'assign_agent': {
        const agentId = new mongoose.Types.ObjectId(step.config.agentId);
        await Contact.findByIdAndUpdate(contactId, { assignedAgentId: agentId });
        if (companyId) {
          await Company.findByIdAndUpdate(companyId, { assignedAgentId: agentId });
        }
        break;
      }

      case 'change_status': {
        const status = step.config.status;
        if (companyId) {
          await Company.findByIdAndUpdate(companyId, { commercialStatus: status });
        }
        break;
      }

      case 'add_tag': {
        const tag = step.config.tag;
        if (tag) {
          await Contact.findByIdAndUpdate(contactId, { $addToSet: { tags: tag } });
          if (companyId) {
            await Company.findByIdAndUpdate(companyId, { $addToSet: { tags: tag } });
          }
        }
        break;
      }

      case 'remove_tag': {
        const tag = step.config.tag;
        if (tag) {
          await Contact.findByIdAndUpdate(contactId, { $pull: { tags: tag } });
          if (companyId) {
            await Company.findByIdAndUpdate(companyId, { $pull: { tags: tag } });
          }
        }
        break;
      }

      case 'add_to_list': {
        const listId = step.config.listId;
        if (listId) {
          await addContactsToList(listId, [contactId.toString()]);
        }
        break;
      }

      case 'create_opportunity': {
        if (companyId) {
          const pipelineId = step.config.pipelineId;
          const stageId = step.config.stageId;
          const val = Number(step.config.value) || 0;

          await Opportunity.create({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            name: step.config.name || 'Negocio Automatizado',
            companyId,
            primaryContactId: contactId,
            pipelineId: new mongoose.Types.ObjectId(pipelineId),
            stageId: new mongoose.Types.ObjectId(stageId),
            estimatedValue: val,
            probability: 50,
            status: 'open',
          });
        }
        break;
      }
    }

    // Log success
    await AutomationExecutionLog.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      executionId: execution._id,
      stepIndex: step.order,
      stepType: step.type,
      status: 'success',
      timestamp: new Date(),
    });

    if (continueWorkflow) {
      execution.currentStepIndex += 1;
      await execution.save();

      // Recurse into next step
      setTimeout(() => {
        executeWorkflowStep(executionId);
      }, 10);
    } else {
      await execution.save();
    }
  } catch (err: any) {
    // Record step error
    await AutomationExecutionLog.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      executionId: execution._id,
      stepIndex: step.order,
      stepType: step.type,
      status: 'failed',
      message: err.message || 'Error durante la ejecución del paso',
      timestamp: new Date(),
    });

    execution.status = 'failed';
    await execution.save();
  }
}

/**
 * Background poller designed to wake up paused executions whose time offsets have expired.
 */
export async function pollPausedExecutions() {
  try {
    const expiredExecutions = await AutomationExecution.find({
      status: 'paused',
      nextExecuteAt: { $lte: new Date() },
    });

    for (const exec of expiredExecutions) {
      exec.status = 'running';
      exec.currentStepIndex += 1; // Move past the wait step
      await exec.save();

      // Resume execution loop in thread
      setTimeout(() => {
        executeWorkflowStep(exec._id.toString());
      }, 10);
    }
  } catch (error) {
    console.error('Automation worker poller failed:', error);
  }
}
