import Organization from '@/models/Organization';
import User from '@/models/User';
import OrganizationMember from '@/models/OrganizationMember';
import Company from '@/models/Company';
import Contact from '@/models/Contact';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import { getOrCreateDefaultPipeline } from './pipelineService';
import { seedDefaultTemplates } from './templateService';
import { writeAuditLog } from '../audit/audit';
import { assertRole } from '../permissions/tenant';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Gathers system-wide SaaS key metrics.
 */
export async function getGlobalMetrics() {
  await assertRole([]); // Requires global SUPER_ADMIN. assertRole([]) verifies isSuperAdmin === true

  const totalOrganizations = await Organization.countDocuments();
  const activeOrganizations = await Organization.countDocuments({ status: { $in: ['active', 'trial'] } });
  const suspendedOrganizations = await Organization.countDocuments({ status: 'suspended' });

  const totalUsers = await User.countDocuments();
  const totalCompanies = await Company.countDocuments({ deletedAt: null });
  const totalContacts = await Contact.countDocuments({ deletedAt: null });

  // Sum emails sent across all subscriptions
  const subSummary = await Subscription.aggregate([
    { $group: { _id: null, totalSent: { $sum: '$emailsSentThisPeriod' } } },
  ]);
  const totalEmailsSent = subSummary[0]?.totalSent || 0;

  // Monthly growth calculation
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newOrgsThisMonth = await Organization.countDocuments({ createdAt: { $gte: startOfMonth } });

  return {
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalUsers,
    totalCompanies,
    totalContacts,
    totalEmailsSent,
    newOrgsThisMonth,
    monthlyGrowthRate: totalOrganizations > 0 ? (newOrgsThisMonth / totalOrganizations) * 100 : 0,
  };
}

/**
 * Administrative registration for new SaaS tenant organizations.
 */
export async function createOrganizationBySuperAdmin(
  orgData: {
    name: string;
    taxId?: string;
    sector?: string;
    country?: string;
    city?: string;
  },
  ownerData: {
    name: string;
    email: string;
    password: string;
  }
) {
  const adminContext = await assertRole([]); // Require isSuperAdmin

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create Organization
    const organization = new Organization({
      ...orgData,
      status: 'active',
    });
    const savedOrg = await organization.save({ session });
    const orgIdStr = savedOrg._id.toString();

    // 2. Create Owner User
    const passwordHash = await bcrypt.hash(ownerData.password, 10);
    const owner = new User({
      name: ownerData.name,
      email: ownerData.email.toLowerCase().trim(),
      passwordHash,
      status: 'active',
      emailVerified: new Date(),
    });
    const savedOwner = await owner.save({ session });

    // 3. Assign Owner Role in Membership
    const member = new OrganizationMember({
      organizationId: savedOrg._id,
      userId: savedOwner._id,
      role: 'OWNER',
      status: 'active',
      joinedAt: new Date(),
    });
    await member.save({ session });

    // 4. Resolve default Plan (PLAN_INICIAL) and create subscription
    const plan = await Plan.findOne({ code: 'PLAN_INICIAL' });
    if (!plan) {
      throw new Error('Plan Inicial default no encontrado. Ejecute el seed del sistema.');
    }

    const subscription = new Subscription({
      organizationId: savedOrg._id,
      planId: plan._id,
      status: 'active',
      emailsSentThisPeriod: 0,
    });
    await subscription.save({ session });

    // 5. Initialize CRM settings & templates (out-of-session database insertions)
    await getOrCreateDefaultPipeline(orgIdStr);
    await seedDefaultTemplates(orgIdStr);

    await session.commitTransaction();
    session.endSession();

    // 6. Write Audit Log
    await writeAuditLog({
      userId: adminContext.userId,
      userName: adminContext.userName,
      action: 'super_admin_create_org',
      entityType: 'Organization',
      entityId: savedOrg._id as mongoose.Types.ObjectId,
      details: { organizationName: savedOrg.name, ownerEmail: savedOwner.email },
    });

    return savedOrg;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

/**
 * Suspends or reactivates a tenant organization.
 */
export async function updateOrganizationStatus(
  organizationId: string,
  status: 'active' | 'suspended' | 'trial'
) {
  const adminContext = await assertRole([]); // Require isSuperAdmin

  const org = await Organization.findById(organizationId);
  if (!org) {
    throw new Error('Organización no encontrada');
  }

  const oldStatus = org.status;
  org.status = status;
  await org.save();

  // Audit Log
  await writeAuditLog({
    userId: adminContext.userId,
    userName: adminContext.userName,
    action: 'super_admin_change_org_status',
    entityType: 'Organization',
    entityId: org._id as mongoose.Types.ObjectId,
    details: { organizationName: org.name, oldStatus, newStatus: status },
  });

  return org;
}

/**
 * Security audit helper logged when a superadmin requests session impersonation.
 */
export async function auditImpersonation(targetUserId: string, reason: string) {
  const adminContext = await assertRole([]); // Require isSuperAdmin

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new Error('Usuario destino para impersonación no encontrado');
  }

  // Enforce strict audit trail prior to impersonation
  await writeAuditLog({
    userId: adminContext.userId,
    userName: adminContext.userName,
    action: 'super_admin_impersonate',
    entityType: 'User',
    entityId: targetUser._id as mongoose.Types.ObjectId,
    details: { impersonatedUser: targetUser.email, reason },
  });

  return {
    success: true,
    message: `Impersonación auditada correctamente para el usuario ${targetUser.email}`,
  };
}
