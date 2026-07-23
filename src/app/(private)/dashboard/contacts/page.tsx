import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Contact from '@/models/Contact';
import Company from '@/models/Company';
import ContactsDashboard from '@/components/ContactsDashboard';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
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

  // Fetch contacts for organization
  const contacts = await Contact.find({
    organizationId: activeOrgId,
    deletedAt: null,
  })
    .sort({ firstName: 1 })
    .lean();

  // Fetch companies for association dropdown autocomplete
  const companies = await Company.find({
    organizationId: activeOrgId,
    deletedAt: null,
  })
    .select('_id razonSocial')
    .sort({ razonSocial: 1 })
    .lean();

  // Serialize Mongoose documents
  const serializedContacts = JSON.parse(JSON.stringify(contacts));
  const serializedCompanies = JSON.parse(JSON.stringify(companies));

  return (
    <ContactsDashboard
      initialContacts={serializedContacts}
      companies={serializedCompanies}
    />
  );
}
