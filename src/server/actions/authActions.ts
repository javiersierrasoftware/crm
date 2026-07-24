'use server';

import { connectToDatabase } from '../database/mongodb';
import User from '@/models/User';
import Organization from '@/models/Organization';
import OrganizationMember from '@/models/OrganizationMember';
import Plan from '@/models/Plan';
import Subscription from '@/models/Subscription';
import { getOrCreateDefaultPipeline } from '../services/pipelineService';
import { seedDefaultTemplates } from '../services/templateService';
import { writeAuditLog } from '../audit/audit';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendMail } from '../email/sender';
import Company from '@/models/Company';

interface RegisterTenantParams {
  name: string;
  email: string;
  passwordHash: string; // Plain password to be hashed
  companyName: string;
  sector?: string;
  country?: string;
  city?: string;
}

/**
 * Handles the registration of a new OWNER user along with their tenant Organization.
 * Performs database actions within a mongoose transaction to ensure atomic integrity.
 */
export async function registerTenant(data: RegisterTenantParams) {
  await connectToDatabase();

  const lowercaseEmail = data.email.toLowerCase().trim();

  // 1. Validate if user already exists
  const existingUser = await User.findOne({ email: lowercaseEmail });
  if (existingUser) {
    return { success: false, error: 'El correo electrónico ya se encuentra registrado' };
  }

  let session: any = null;
  let useTransaction = false;

  try {
    const db = mongoose.connection.db;
    if (db) {
      const adminDb = db.admin();
      const helloRes = await adminDb.command({ hello: 1 }).catch(() => adminDb.command({ isMaster: 1 }));
      // Transactions require replica sets (setName) or sharded clusters (msg: 'isdbgrid')
      if (helloRes && (helloRes.setName || helloRes.hosts || helloRes.msg === 'isdbgrid')) {
        useTransaction = true;
      }
    }
  } catch (err) {
    console.warn('Bypassing transaction checks due to topology probe error:', err);
  }

  if (useTransaction) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      useTransaction = false;
    }
  }

  const saveOptions = useTransaction && session ? { session } : undefined;

  try {
    // 2. Create Organization
    const organization = new Organization({
      name: data.companyName,
      sector: data.sector || 'Otros',
      country: data.country || '',
      city: data.city || '',
      status: 'trial', // Default on signup
    });

    const savedOrg = await organization.save(saveOptions);
    const orgIdStr = savedOrg._id.toString();

    // 3. Hash Password & Create User
    const passwordHash = await bcrypt.hash(data.passwordHash, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      name: data.name,
      email: lowercaseEmail,
      passwordHash,
      status: 'inactive', // Inactive until verified from email link
      emailVerified: null,
      verificationToken,
    });

    const savedUser = await user.save(saveOptions);

    // 4. Create OWNER Organization Member
    const member = new OrganizationMember({
      organizationId: savedOrg._id,
      userId: savedUser._id,
      role: 'OWNER',
      status: 'active',
      joinedAt: new Date(),
    });

    await member.save(saveOptions);

    // 5. Assign Default Plan & Subscription
    // Attempt to find or create the default Plan if not exists
    let plan = await Plan.findOne({ code: 'PLAN_GRATIS' as any });
    if (!plan) {
      const planRes = await Plan.create(
        [
          {
            name: 'Plan Gratis',
            code: 'PLAN_GRATIS',
            maxUsers: 1,
            maxCompanies: 10,
            maxContacts: 50,
            maxEmailsPerMonth: 100,
            maxAutomations: 0,
            price: 0,
            discountPercent: 0,
          },
        ],
        saveOptions
      );
      plan = planRes[0];
    }

    const subscription = new Subscription({
      organizationId: savedOrg._id,
      planId: plan!._id,
      status: 'active',
      emailsSentThisPeriod: 0,
      companiesLoaded: true, // Auto-loaded 10 free companies
    });

    await subscription.save(saveOptions);

    // Auto-seed 10 free companies matching chosen sector from global pool
    const sectorName = data.sector || '';
    let templates = await Company.find({
      organizationId: { $ne: savedOrg._id },
      actividad: { $regex: new RegExp(sectorName, 'i') },
      deletedAt: null,
    })
      .limit(10)
      .lean();

    if (templates.length === 0) {
      templates = await Company.find({
        organizationId: { $ne: savedOrg._id },
        deletedAt: null,
      })
        .limit(10)
        .lean();
    }

    if (templates.length > 0) {
      const freeCompanies = templates.map((tpl: any) => {
        const copy = { ...tpl };
        delete copy._id;
        delete copy.createdAt;
        delete copy.updatedAt;
        copy.organizationId = savedOrg._id;
        copy.status = 'Nuevo';
        return copy;
      });
      await Company.insertMany(freeCompanies, saveOptions || {});
    }

    // 6. Seed Pipelines and Templates for the new tenant
    await getOrCreateDefaultPipeline(orgIdStr);
    await seedDefaultTemplates(orgIdStr);

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">¡Bienvenido a CREATIX CRM!</h2>
        <p>Hola ${data.name},</p>
        <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro y activar tu cuenta, por favor verifica tu correo haciendo clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verificar Correo Electrónico
          </a>
        </div>
        <p style="font-size: 11px; color: #64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador: <br/> <a href="${verificationUrl}">${verificationUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;"/>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 0;">CREATIX CRM - Equipo de Soporte</p>
      </div>
    `;

    await sendMail({
      to: lowercaseEmail,
      subject: 'Verifica tu correo electrónico - CREATIX CRM',
      html: emailHtml,
      fromName: 'CREATIX CRM Soporte',
      fromEmail: process.env.SMTP_USER || 'ticsoft.contacto@gmail.com',
    });

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    // 7. Log Audit Action
    await writeAuditLog({
      userId: savedUser._id.toString(),
      userName: savedUser.name,
      organizationId: orgIdStr,
      action: 'register_tenant',
      entityType: 'Organization',
      entityId: savedOrg._id as mongoose.Types.ObjectId,
      details: { organizationName: savedOrg.name, ownerEmail: savedUser.email },
    });

    return { success: true };
  } catch (err: any) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Registration transaction aborted:', err);
    return { success: false, error: err.message || 'Error inesperado durante el registro' };
  }
}

export async function verifyEmailAction(token: string) {
  try {
    if (!token) {
      return { success: false, error: 'Token de verificación no proporcionado' };
    }

    await connectToDatabase();

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return { success: false, error: 'Token de verificación no válido o expirado.' };
    }

    user.emailVerified = new Date();
    user.status = 'active';
    user.verificationToken = null;
    await user.save();

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return { success: false, error: error.message || 'Error durante la verificación del correo.' };
  }
}
