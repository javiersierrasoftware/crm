import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import Sidebar from '@/components/Sidebar';
import { connectToDatabase } from '@/server/database/mongodb';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import Organization from '@/models/Organization';
import Company from '@/models/Company';
import {
  EmailVerificationLock,
  UnpaidLockScreen,
  OnboardingDbLoader,
} from '@/components/OnboardingLockScreens';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const isSuperAdmin = user.isSuperAdmin;

  await connectToDatabase();

  // 1. Sync and lock plan prices in DB to match landing page values
  await Plan.updateOne(
    { code: 'PLAN_GRATIS' as any },
    {
      $set: {
        name: 'Plan Gratis',
        price: 0,
        maxUsers: 1,
        maxCompanies: 10,
        maxContacts: 50,
        maxEmailsPerMonth: 100,
        maxAutomations: 0,
        discountPercent: 0,
      }
    },
    { upsert: true }
  );
  await Plan.updateOne({ code: 'PLAN_INICIAL' as any }, { $set: { price: 29000 } });
  await Plan.updateOne({ code: 'PLAN_PROFESIONAL' as any }, { $set: { price: 89000 } });
  await Plan.updateOne({ code: 'PLAN_EMPRESARIAL' as any }, { $set: { price: 249000 } });

  // 2. Fetch fresh user data from database to check email verification status
  const dbUser = await User.findById(user.id);
  if (!dbUser) {
    redirect('/login');
  }

  // 3. Email Verification check (SuperAdmin is exempt)
  if (!isSuperAdmin && !dbUser.emailVerified) {
    return <EmailVerificationLock email={dbUser.email} />;
  }

  let activePlanCode = 'PLAN_GRATIS';

  // 4. Subscription & Onboarding checks (SuperAdmin is exempt)
  if (user.activeOrganizationId) {
    const sub = await Subscription.findOne({ organizationId: user.activeOrganizationId }).populate('planId');
    const planDoc = sub?.planId as any;
    if (planDoc) {
      activePlanCode = planDoc.code;
    }

    if (!isSuperAdmin) {
      // Check if subscription is paid/active and not expired
      const isExpired = sub?.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd);
      if (!sub || sub.status !== 'active' || isExpired) {
        const plansList = await Plan.find().lean();
        return <UnpaidLockScreen plans={JSON.parse(JSON.stringify(plansList))} />;
      }

      // Check if companies are loaded for the upgraded plan
      if (sub.companiesLoaded === false) {
        const org = await Organization.findById(user.activeOrganizationId);
        return (
          <OnboardingDbLoader
            planName={planDoc?.name || 'Inicial'}
            maxCompanies={planDoc?.maxCompanies || 5000}
            sector={org?.sector || 'Tecnología'}
          />
        );
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activePlanCode={activePlanCode}
        isSuperAdmin={isSuperAdmin}
        userName={session.user.name || 'Asesor'}
        userEmail={session.user.email || ''}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="h-14 border-b border-slate-900 bg-slate-950/60 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-md">
              C
            </div>
            <span className="font-extrabold text-md text-white">CREATIX</span>
          </div>
          <SignOutButton />
        </header>

        {/* Render Page */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
