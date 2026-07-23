import { handlers } from '@/auth';

export const { GET, POST } = handlers;
export const runtime = 'nodejs'; // Ensure this runs in Node.js environment, not Edge
