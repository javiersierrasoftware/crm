import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Pipeline from '@/models/Pipeline';
import { Opportunity } from '@/models/Opportunity';
import Company from '@/models/Company';
import KanbanBoard from '@/components/KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
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

  // Fetch pipeline stages
  const pipeline = await Pipeline.findOne({ organizationId: activeOrgId, isDefault: true })
    || await Pipeline.findOne({ organizationId: activeOrgId });

  // Fetch open opportunities
  const opportunities = await Opportunity.find({
    organizationId: activeOrgId,
    status: 'open',
    deletedAt: null,
  })
    .populate('companyId')
    .lean();

  // Fetch light list of companies for manual deal creation dropdown
  const companies = await Company.find({
    organizationId: activeOrgId,
    deletedAt: null,
  })
    .select('_id razonSocial')
    .sort({ razonSocial: 1 })
    .lean();

  // Serialize Mongoose documents
  const serializedStages = JSON.parse(JSON.stringify(pipeline?.stages || []));
  const serializedOpps = JSON.parse(JSON.stringify(opportunities));
  const serializedCompanies = JSON.parse(JSON.stringify(companies));

  return (
    <KanbanBoard
      stages={serializedStages}
      initialOpportunities={serializedOpps}
      companies={serializedCompanies}
    />
  );
}
