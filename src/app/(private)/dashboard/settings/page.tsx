import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Organization from '@/models/Organization';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import { getApiKeysAction } from '@/server/actions/apiKeyActions';
import { getAuditLogsAction } from '@/server/actions/auditActions';
import SettingsDashboard from '@/components/SettingsDashboard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const activeOrgId = user.activeOrganizationId;

  if (!activeOrgId) {
    redirect('/dashboard');
  }

  await connectToDatabase();

  // 1. Fetch organization profile and subscription
  const org = await Organization.findById(activeOrgId).lean();
  const sub = await Subscription.findOne({ organizationId: activeOrgId }).populate('planId').lean();
  const plan = sub?.planId as any;

  // 2. Fetch API Keys and initial Audit Logs
  const apiKeys = await getApiKeysAction();
  const auditLogsResult = await getAuditLogsAction(1, 10);

  // Serialize Mongoose documents
  const serializedOrg = JSON.parse(JSON.stringify(org));
  const serializedSub = JSON.parse(JSON.stringify(sub));
  const serializedPlan = JSON.parse(JSON.stringify(plan));
  const serializedApiKeys = JSON.parse(JSON.stringify(apiKeys));
  const serializedAuditLogs = JSON.parse(JSON.stringify(auditLogsResult));

  return (
    <SettingsDashboard
      organization={serializedOrg}
      subscription={serializedSub}
      plan={serializedPlan}
      initialApiKeys={serializedApiKeys}
      initialAuditLogs={serializedAuditLogs}
    />
  );
}
