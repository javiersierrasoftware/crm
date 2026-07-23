import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all paths except authentication endpoints, public pages, public forms, api routes, and static assets
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|verify-email|terms|privacy|$).*)',
  ],
};
