import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { connectToDatabase } from '@/server/database/mongodb';
import User from '@/models/User';
import OrganizationMember from '@/models/OrganizationMember';
import Organization from '@/models/Organization';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email.toString().toLowerCase() });
        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password.toString(),
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        if (user.status === 'suspended') {
          throw new Error('USER_SUSPENDED');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      await connectToDatabase();

      if (user) {
        token.id = user.id;
        token.isSuperAdmin = (user as any).isSuperAdmin || false;

        // Fetch memberships for the user
        const members = await OrganizationMember.find({ userId: user.id, status: 'active' });
        const memberships = [];

        for (const member of members) {
          const org = await Organization.findById(member.organizationId);
          if (org && org.status !== 'suspended') {
            memberships.push({
              organizationId: org._id.toString(),
              organizationName: org.name,
              logoUrl: org.logoUrl,
              role: member.role,
            });
          }
        }

        token.memberships = memberships;

        if (memberships.length > 0) {
          token.activeOrganizationId = memberships[0].organizationId;
          token.activeRole = memberships[0].role;
        } else {
          token.activeOrganizationId = null;
          token.activeRole = null;
        }
      }

      // Handle active tenant switches from the frontend (session updates)
      if (trigger === 'update' && session?.activeOrganizationId) {
        const targetOrgId = session.activeOrganizationId;
        const memberships = (token.memberships as any[]) || [];
        const match = memberships.find((m) => m.organizationId === targetOrgId);

        if (match) {
          token.activeOrganizationId = targetOrgId;
          token.activeRole = match.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).isSuperAdmin = token.isSuperAdmin || false;
        (session.user as any).memberships = token.memberships || [];
        (session.user as any).activeOrganizationId = token.activeOrganizationId || null;
        (session.user as any).activeRole = token.activeRole || null;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET,
});
