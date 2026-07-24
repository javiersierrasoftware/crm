import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isSuperAdminRoute = nextUrl.pathname.startsWith('/super-admin');
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/forgot-password') ||
        nextUrl.pathname.startsWith('/verify-email');

      if (isDashboard || isSuperAdminRoute) {
        if (!isLoggedIn) {
          return false; // Redirect to sign-in page
        }

        // For super-admin routes, verify global admin rights
        if (isSuperAdminRoute) {
          return !!(auth.user as any).isSuperAdmin;
        }

        return true;
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
  },
  providers: [], // Configured in auth.ts (Node environment)
};
