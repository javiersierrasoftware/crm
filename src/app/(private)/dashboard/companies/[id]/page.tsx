import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Company from '@/models/Company';
import { getCompanyLogs } from '@/server/actions/companyLogActions';
import { getTemplates } from '@/server/actions/templateActions';
import CompanyDetailView from '@/components/CompanyDetailView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const { id } = await params;

  // Guard against invalid ObjectId patterns (like "new") to prevent database CastErrors
  if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
    redirect('/dashboard/companies');
  }

  await connectToDatabase();

  const company = await Company.findById(id).lean();
  if (!company) {
    redirect('/dashboard/companies');
  }

  // Fetch company logs and templates
  const logs = await getCompanyLogs(id);
  const templates = await getTemplates();

  // Serialize Mongoose documents
  const serializedCompany = JSON.parse(JSON.stringify(company));

  return (
    <CompanyDetailView
      company={serializedCompany}
      initialLogs={logs}
      templates={templates}
      currentUser={session.user}
    />
  );
}
