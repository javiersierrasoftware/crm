import { auth } from '@/auth';

export class TenantError extends Error {
  public code: 'UNAUTHORIZED' | 'NO_ACTIVE_TENANT' | 'FORBIDDEN';

  constructor(message: string, code: 'UNAUTHORIZED' | 'NO_ACTIVE_TENANT' | 'FORBIDDEN' = 'FORBIDDEN') {
    super(message);
    this.name = 'TenantError';
    this.code = code;
  }
}

export interface TenantContext {
  userId: string;
  userName: string;
  organizationId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
}

/**
 * Extracts and validates the authenticated user's organization context.
 * Throws a TenantError if the user is not authenticated or has no active organization.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new TenantError('Sesión no iniciada o inválida. Inicie sesión nuevamente.', 'UNAUTHORIZED');
  }

  const userId = session.user.id;
  const isSuperAdmin = (session.user as any).isSuperAdmin || false;
  const organizationId = (session.user as any).activeOrganizationId;
  const role = (session.user as any).activeRole;

  if (!organizationId && !isSuperAdmin) {
    throw new TenantError(
      'No tiene una organización activa asignada. Póngase en contacto con el administrador.',
      'NO_ACTIVE_TENANT'
    );
  }

  return {
    userId,
    userName: session.user.name || session.user.email || 'Usuario',
    organizationId: organizationId ? organizationId.toString() : null,
    role,
    isSuperAdmin,
  };
}

/**
 * Asserts that the authenticated user possesses one of the allowed roles.
 * Super admins bypass local role constraints.
 */
export async function assertRole(allowedRoles: ('OWNER' | 'ADMIN' | 'SALES_MANAGER' | 'SALES_AGENT' | 'MARKETING' | 'VIEWER')[]): Promise<TenantContext> {
  const context = await getTenantContext();
  if (context.isSuperAdmin) {
    return context;
  }

  if (!context.role || !allowedRoles.includes(context.role as any)) {
    throw new TenantError('No tiene permisos suficientes para realizar esta acción.', 'FORBIDDEN');
  }

  return context;
}
