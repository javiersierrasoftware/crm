import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import { Campaign } from '@/models/Campaign';
import Company from '@/models/Company';
import { getTemplates } from '@/server/actions/templateActions';
import CampaignsDashboard from '@/components/CampaignsDashboard';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
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

  // Fetch campaigns for organization
  const campaigns = await Campaign.find({ organizationId: activeOrgId }).sort({ sentAt: -1 }).lean();

  // Fetch email templates
  const emailTemplates = await getTemplates('email');

  // Fetch distinct activities and cities for segmentation dropdowns
  const [activities, cities] = await Promise.all([
    Company.distinct('actividad', { organizationId: activeOrgId, deletedAt: null }),
    Company.distinct('munComercial', { organizationId: activeOrgId, deletedAt: null }),
  ]);

  const sortedActivities = activities.filter(Boolean).sort();
  const sortedCities = cities.filter(Boolean).sort();

  // Serialize documents for client consumption
  const serializedCampaigns = JSON.parse(JSON.stringify(campaigns));

  return (
    <CampaignsDashboard
      initialCampaigns={serializedCampaigns}
      templates={emailTemplates}
      activities={sortedActivities}
      cities={sortedCities}
    />
  );
}
