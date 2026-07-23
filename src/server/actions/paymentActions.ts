'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import Plan from '@/models/Plan';
import Subscription from '@/models/Subscription';
import Transaction from '@/models/Transaction';
import Organization from '@/models/Organization';
import OrganizationMember from '@/models/OrganizationMember';
import User from '@/models/User';
import { sendMail } from '../email/sender';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import crypto from 'crypto';
import PendingPayment from '@/models/PendingPayment';

/**
 * Ensures plans exist in database and sets prices in COP.
 */
async function ensurePlansCOP() {
  const plans = [
    {
      name: 'Plan Inicial',
      code: 'PLAN_INICIAL' as const,
      maxUsers: 3,
      maxCompanies: 5000,
      maxContacts: 10000,
      maxEmailsPerMonth: 5000,
      maxAutomations: 5,
      price: 35000, // 35k COP
    },
    {
      name: 'Plan Profesional',
      code: 'PLAN_PROFESIONAL' as const,
      maxUsers: 10,
      maxCompanies: 25000,
      maxContacts: 50000,
      maxEmailsPerMonth: 30000,
      maxAutomations: 15,
      price: 89000, // 89k COP
    },
    {
      name: 'Plan Empresarial',
      code: 'PLAN_EMPRESARIAL' as const,
      maxUsers: 9999,
      maxCompanies: 999999,
      maxContacts: 999999,
      maxEmailsPerMonth: 999999,
      maxAutomations: 999,
      price: 249000, // 249k COP
    }
  ];

  for (const p of plans) {
    const existing = await Plan.findOne({ code: p.code });
    if (!existing) {
      await Plan.create({ ...p, discountPercent: 0 });
    } else if (existing.price < 1000) {
      // Migrate old USD price (e.g. 29/79) to COP values
      existing.price = p.price;
      await existing.save();
    }
  }
}

export async function getWompiPaymentDataAction(
  planCode: 'PLAN_INICIAL' | 'PLAN_PROFESIONAL',
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();
    await ensurePlansCOP();

    const plan = await Plan.findOne({ code: planCode as any });
    if (!plan) {
      return { success: false, error: 'El plan especificado no está registrado en el sistema' };
    }

    // Apply SuperAdmin discount
    let finalPrice = Math.round(plan.price * (1 - (plan.discountPercent || 0) / 100));
    
    // Apply annual discount if selected (base * 12 * 0.80)
    if (billingPeriod === 'yearly') {
      finalPrice = Math.round(finalPrice * 12 * 0.80);
    }

    const amountInCents = finalPrice * 100;
    const currency = 'COP';

    // Unique reference: ref_RANDOM_TIMESTAMP (approx 34 chars total, under Wompi's 36-char limit)
    const reference = `ref_${crypto.randomBytes(6).toString('hex')}_${Date.now()}`;

    // Wompi API Configuration
    const privateKey = process.env.WOMPI_PRV_KEY?.trim() || 'prv_test_0Xvu94d5ryt0vTipMoeOL9tYdA4vReDX';
    const isTest = privateKey.startsWith('prv_test_');
    const wompiApiUrl = isTest
      ? 'https://sandbox.wompi.co/v1/payment_links'
      : 'https://production.wompi.co/v1/payment_links';

    const payload = {
      name: `Plan ${plan.name} (${billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})`,
      description: `Suscripción comercial en Creatix CRM`,
      single_use: true,
      collect_shipping: false,
      currency: currency,
      amount_in_cents: amountInCents,
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings`,
      sku: reference
    };

    const response = await fetch(wompiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Wompi API Error Response:", JSON.stringify(data, null, 2));
      return { success: false, error: data.error?.reason || 'Error al generar el link de pago con Wompi.' };
    }

    const checkoutUrl = `https://checkout.wompi.co/l/${data.data.id}`;

    // Store the payment link relationship in our DB
    await PendingPayment.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      planId: plan._id,
      billingPeriod,
      paymentLinkId: data.data.id,
    });

    return {
      success: true,
      checkoutUrl,
      finalPrice,
      planName: plan.name,
    };
  } catch (error: any) {
    console.error('Error generating Wompi data:', error);
    return { success: false, error: error.message || 'Error al procesar pago' };
  }
}

export async function confirmWompiPaymentAction(wompiTxId: string) {
  try {
    await connectToDatabase();

    // Query Wompi Sandbox/Production transaction details
    const isProd = process.env.NEXT_PUBLIC_WOMPI_PUB_KEY?.startsWith('pub_prod');
    const baseUrl = isProd ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

    const privateKey = process.env.WOMPI_PRV_KEY?.trim() || 'prv_test_0Xvu94d5ryt0vTipMoeOL9tYdA4vReDX';
    const response = await fetch(`${baseUrl}/transactions/${wompiTxId}`, {
      headers: {
        'Authorization': `Bearer ${privateKey}`
      }
    });

    if (!response.ok) {
      console.error('[confirmWompiPaymentAction] Wompi request failed:', response.status);
      return { success: false, error: 'No se pudo verificar la transacción con Wompi.' };
    }

    const json = await response.json();
    console.log('[confirmWompiPaymentAction] Full response:', JSON.stringify(json, null, 2));
    const tx = json.data;

    if (!tx || tx.status !== 'APPROVED') {
      return { success: false, error: `Transacción Wompi no aprobada (Estado: ${tx?.status || 'desconocido'})` };
    }

    let orgId: string;
    let planId: string;
    let isYearly: boolean;

    const paymentLinkId = tx.payment_link_id;
    let pending = null;

    if (paymentLinkId) {
      pending = await PendingPayment.findOne({ paymentLinkId });
    }

    if (!pending) {
      // Fallback/Backward compatibility check for old longer references in test transactions
      const reference = tx.reference || '';
      const parts = reference.split('_');
      if (parts.length >= 4 && parts[0] === 'ref') {
        orgId = parts[1];
        planId = parts[2];
        const period = parts[3];
        isYearly = period === 'yearly';
      } else {
        return { success: false, error: 'No se encontró el registro de pago pendiente para este enlace o ha expirado.' };
      }
    } else {
      orgId = pending.organizationId.toString();
      planId = pending.planId.toString();
      isYearly = pending.billingPeriod === 'yearly';
    }

    // 1. Log payment transaction
    const reference = tx.reference || '';
    let transaction = await Transaction.findOne({ wompiTransactionId: wompiTxId });
    if (!transaction) {
      transaction = await Transaction.create({
        organizationId: new mongoose.Types.ObjectId(orgId),
        planId: new mongoose.Types.ObjectId(planId),
        amount: tx.amount_in_cents / 100,
        wompiTransactionId: wompiTxId,
        status: 'APPROVED',
        reference,
      });
    }

    // 2. Update Subscription
    let subscription = await Subscription.findOne({ organizationId: new mongoose.Types.ObjectId(orgId) });
    if (!subscription) {
      subscription = new Subscription({
        organizationId: new mongoose.Types.ObjectId(orgId),
        planId: new mongoose.Types.ObjectId(planId),
        status: 'active',
        emailsSentThisPeriod: 0,
      });
    }

    subscription.planId = new mongoose.Types.ObjectId(planId);
    subscription.status = 'active';
    subscription.companiesLoaded = false; // Trigger database loading onboarding for upgraded plan limits!
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = isYearly
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year renewal
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days renewal
    await subscription.save();

    // 3. Send email receipt to owner admins
    const plan = await Plan.findById(planId);
    const org = await Organization.findById(orgId);

    const members = await OrganizationMember.find({
      organizationId: new mongoose.Types.ObjectId(orgId),
      role: { $in: ['OWNER', 'ADMIN'] },
    });

    const userIds = members.map(m => m.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const emails = users.map(u => u.email).filter(Boolean);

    if (emails.length > 0) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">¡Suscripción Renovada Exitosamente!</h2>
          <p>Estimado Cliente,</p>
          <p>Le confirmamos que hemos recibido su pago con Wompi. Su suscripción en el CRM ha sido renovada:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: #f8fafc; border-radius: 8px;">
            <tr>
              <td style="padding: 10px; font-weight: bold;">Organización:</td>
              <td style="padding: 10px;">${org?.name || 'Su Empresa'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Plan:</td>
              <td style="padding: 10px;">${plan?.name || 'Inicial'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Valor Pagado:</td>
              <td style="padding: 10px; color: #10b981; font-weight: bold;">$${(tx.amount_in_cents / 100).toLocaleString('es-CO')} COP</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">ID Transacción:</td>
              <td style="padding: 10px; font-family: monospace; font-size: 11px;">${wompiTxId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Próximo Vence:</td>
              <td style="padding: 10px;">${subscription.currentPeriodEnd.toLocaleDateString('es-CO')}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Ya puede seguir gestionando sus oportunidades y campañas de marketing sin interrupción.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;"/>
          <p style="font-size: 11px; color: #64748b; text-align: center;">CREATIX CRM - Soporte de Facturación</p>
        </div>
      `;

      await sendMail({
        to: emails.join(','),
        subject: `[Facturación] Confirmación de Pago - CRM ${org?.name || ''}`,
        html: emailHtml,
        fromName: 'CREATIX CRM Facturación',
        fromEmail: process.env.SMTP_USER || 'ticsoft.contacto@gmail.com',
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return { success: false, error: error.message || 'Error al validar pago' };
  }
}

export async function getSalesDashboardAction() {
  try {
    const context = await getTenantContext();
    if (!context.isSuperAdmin) {
      return { success: false, error: 'Permisos insuficientes' };
    }

    await connectToDatabase();
    await ensurePlansCOP();

    const [transactions, organizations, plans, subscriptions] = await Promise.all([
      Transaction.find().sort({ createdAt: -1 }).populate('organizationId planId').lean(),
      Organization.find().lean(),
      Plan.find().lean(),
      Subscription.find().populate('planId').lean(),
    ]);

    const totalRevenue = transactions
      .filter((t: any) => t.status === 'APPROVED')
      .reduce((sum, t: any) => sum + (t.amount || 0), 0);

    return {
      success: true,
      transactions: JSON.parse(JSON.stringify(transactions)),
      organizationsCount: organizations.length,
      totalRevenue,
      plans: JSON.parse(JSON.stringify(plans)),
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
    };
  } catch (error: any) {
    console.error('Error fetching sales stats:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePlanPriceAction(planCode: string, price: number, discountPercent: number) {
  try {
    const context = await getTenantContext();
    if (!context.isSuperAdmin) {
      return { success: false, error: 'Permisos insuficientes' };
    }

    await connectToDatabase();

    const plan = await Plan.findOne({ code: planCode as any });
    if (!plan) {
      return { success: false, error: 'Plan no encontrado' };
    }

    plan.price = Number(price) || 0;
    plan.discountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    await plan.save();

    revalidatePath('/dashboard/superadmin');
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return { success: false, error: error.message || 'Error al actualizar plan' };
  }
}

/**
 * Background / Automated Cron Action to check subscriptions expiring soon or expired,
 * and dispatch payment reminder emails. Runs once a day.
 */
export async function runSubscriptionRenewalCheckAction() {
  try {
    await connectToDatabase();

    const now = new Date();
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Find subscriptions expiring in less than 3 days, or already expired
    const subscriptions = await Subscription.find({
      status: { $in: ['active', 'trialing'] },
    }).populate('planId');

    let notifiedCount = 0;
    let suspendedCount = 0;

    for (const sub of subscriptions) {
      const org = await Organization.findById(sub.organizationId);
      if (!org) continue;

      const plan = sub.planId as any;

      // Find owner/admin users of the organization
      const members = await OrganizationMember.find({
        organizationId: sub.organizationId,
        role: { $in: ['OWNER', 'ADMIN'] },
      });
      const userIds = members.map(m => m.userId);
      const users = await User.find({ _id: { $in: userIds } });
      const emails = users.map(u => u.email).filter(Boolean);

      if (emails.length === 0) continue;

      if (sub.currentPeriodEnd < now) {
        // 1. Subscription has EXPIRED: Suspend tenant and notify
        sub.status = 'suspended';
        await sub.save();
        suspendedCount++;

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fda4af; border-radius: 10px;">
            <h2 style="color: #e11d48; border-bottom: 2px solid #fda4af; padding-bottom: 10px; margin-top: 0;">Suscripción Suspendida - Pago Pendiente</h2>
            <p>Estimado Cliente,</p>
            <p>Le informamos que el periodo de pago de su suscripción de su CRM <strong>(${org.name})</strong> finalizó el <strong>${sub.currentPeriodEnd.toLocaleDateString('es-CO')}</strong>.</p>
            <p style="background: #fff1f2; color: #be123c; padding: 12px; border-radius: 8px; border-left: 4px solid #e11d48;">
              Su cuenta ha sido suspendida temporalmente y el acceso a los módulos de empresas y campañas estará bloqueado hasta que se confirme su pago.
            </p>
            <p>Puede renovar su plan en cualquier momento entrando a la sección de <strong>Configuración > Pestaña General</strong> en su panel del CRM.</p>
            <hr style="border: none; border-top: 1px solid #fda4af; margin-top: 30px;"/>
            <p style="font-size: 11px; color: #be123c; text-align: center; margin-bottom: 0;">CREATIX CRM - Soporte de Facturación</p>
          </div>
        `;

        await sendMail({
          to: emails.join(','),
          subject: `[CRÍTICO] Suscripción Vencida - CRM ${org.name}`,
          html: emailHtml,
          fromName: 'Facturación CREATIX CRM',
          fromEmail: process.env.SMTP_USER || 'ticsoft.contacto@gmail.com',
        });
      } else if (sub.currentPeriodEnd <= threeDaysFromNow) {
        // 2. Expiring in less than 3 days: Send warning reminder email
        notifiedCount++;
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fde047; border-radius: 10px;">
            <h2 style="color: #a16207; border-bottom: 2px solid #fde047; padding-bottom: 10px; margin-top: 0;">Recordatorio de Pago Próximo</h2>
            <p>Estimado Cliente,</p>
            <p>Le recordamos que su suscripción del plan <strong>${plan?.name || 'Inicial'}</strong> para la organización <strong>${org.name}</strong> está próxima a vencer el <strong>${sub.currentPeriodEnd.toLocaleDateString('es-CO')}</strong>.</p>
            <p>Para evitar la interrupción de sus tareas comerciales y la suspensión de su CRM, le sugerimos renovar su suscripción ingresando al panel de <strong>Configuración</strong> en su CRM.</p>
            <hr style="border: none; border-top: 1px solid #fde047; margin-top: 30px;"/>
            <p style="font-size: 11px; color: #a16207; text-align: center; margin-bottom: 0;">CREATIX CRM - Soporte de Facturación</p>
          </div>
        `;

        await sendMail({
          to: emails.join(','),
          subject: `[Facturación] Aviso de vencimiento próximo - CRM ${org.name}`,
          html: emailHtml,
          fromName: 'Facturación CREATIX CRM',
          fromEmail: process.env.SMTP_USER || 'ticsoft.contacto@gmail.com',
        });
      }
    }

    return { success: true, notifiedCount, suspendedCount };
  } catch (error: any) {
    console.error('Error running renewal cron check:', error);
    return { success: false, error: error.message };
  }
}
