import Company, { ICompany } from '@/models/Company';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { companySchema } from '@/schemas/company';
import mongoose from 'mongoose';
import { getTenantLimitStatus } from './limitsService';

interface GetCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  actividad?: string;
  munComercial?: string;
  assignedAgentId?: string;
  interestLevel?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getCompanies(params: GetCompaniesParams) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  // Build query
  const query: Record<string, any> = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  };

  // Search filter
  if (params.search) {
    const searchRegex = new RegExp(params.search, 'i');
    query.$or = [
      { razonSocial: searchRegex },
      { legalName: searchRegex },
      { emailComercial: searchRegex },
      { nit: searchRegex },
    ];
  }

  // Value filters
  if (params.status) {
    query.status = params.status;
  }
  if (params.actividad) {
    query.actividad = params.actividad;
  }
  if (params.munComercial) {
    query.munComercial = params.munComercial;
  }
  if (params.assignedAgentId) {
    query.assignedAgentId = new mongoose.Types.ObjectId(params.assignedAgentId);
  }
  if (params.interestLevel) {
    query.interestLevel = params.interestLevel;
  }
  if (params.tag) {
    query.tags = params.tag;
  }

  // Sorting
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
  const sort: Record<string, any> = { [sortBy]: sortOrder };

  const total = await Company.countDocuments(query);
  const companies = await Company.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('assignedAgentId', 'name email');

  return {
    companies,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCompanyById(id: string): Promise<ICompany> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const company = await Company.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  }).populate('assignedAgentId', 'name email');

  if (!company) {
    throw new Error('Empresa no encontrada o no pertenece a su organización');
  }

  return company;
}

export async function checkCompanyDuplicate(params: { nit?: string; emailComercial?: string; excludeId?: string }) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  if (!params.nit && !params.emailComercial) {
    return { duplicate: false };
  }

  const query: Record<string, any> = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  };

  if (params.excludeId) {
    query._id = { $ne: new mongoose.Types.ObjectId(params.excludeId) };
  }

  const conditions = [];
  if (params.nit) {
    conditions.push({ nit: params.nit.trim() });
  }
  if (params.emailComercial) {
    conditions.push({ emailComercial: params.emailComercial.trim().toLowerCase() });
  }

  query.$or = conditions;

  const existing = await Company.findOne(query);

  if (existing) {
    const isTaxMatch = params.nit && existing.nit === params.nit.trim();
    return {
      duplicate: true,
      reason: isTaxMatch ? 'nit_exists' : 'email_exists',
      companyName: existing.razonSocial,
    };
  }

  return { duplicate: false };
}

export async function createCompany(data: any): Promise<ICompany> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Check company limits
  const limitStatus = await getTenantLimitStatus(organizationId, 'companies');
  if (!limitStatus.allowed) {
    throw new Error(`Límite alcanzado: Su plan actual solo le permite registrar hasta ${limitStatus.limit} empresas. Mejore su plan en Configuración para registrar más.`);
  }

  // Validate fields
  const parsed = companySchema.parse(data);

  // Check duplicate
  if (parsed.nit || parsed.emailComercial) {
    const dupCheck = await checkCompanyDuplicate({
      nit: parsed.nit,
      emailComercial: parsed.emailComercial,
    });
    if (dupCheck.duplicate) {
      throw new Error(
        `Duplicado detectado: Ya existe una empresa con ese ${
          dupCheck.reason === 'nit_exists' ? 'NIT/Identificación' : 'Correo electrónico'
        } (${dupCheck.companyName})`
      );
    }
  }

  // Build document
  const companyDoc = new Company({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    assignedAgentId: parsed.assignedAgentId
      ? new mongoose.Types.ObjectId(parsed.assignedAgentId)
      : null,
  });

  const saved = await companyDoc.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_company',
    entityType: 'Company',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { razonSocial: saved.razonSocial },
  });

  return saved;
}

export async function updateCompany(id: string, data: any): Promise<ICompany> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Verify company ownership first
  const existingCompany = await Company.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!existingCompany) {
    throw new Error('Empresa no encontrada o no pertenece a su organización');
  }

  // Validate fields
  const parsed = companySchema.parse(data);

  // Check duplicate (excluding this company)
  if (parsed.nit || parsed.emailComercial) {
    const dupCheck = await checkCompanyDuplicate({
      nit: parsed.nit,
      emailComercial: parsed.emailComercial,
      excludeId: id,
    });
    if (dupCheck.duplicate) {
      throw new Error(
        `Duplicado detectado: Ya existe otra empresa con ese ${
          dupCheck.reason === 'nit_exists' ? 'NIT/Identificación' : 'Correo electrónico'
        } (${dupCheck.companyName})`
      );
    }
  }

  // Update properties
  Object.assign(existingCompany, {
    ...parsed,
    assignedAgentId: parsed.assignedAgentId
      ? new mongoose.Types.ObjectId(parsed.assignedAgentId)
      : null,
  });

  const updated = await existingCompany.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_company',
    entityType: 'Company',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { razonSocial: updated.razonSocial },
  });

  return updated;
}

export async function deleteCompany(id: string): Promise<void> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const existingCompany = await Company.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!existingCompany) {
    throw new Error('Empresa no encontrada o no pertenece a su organización');
  }

  // Perform soft delete
  existingCompany.deletedAt = new Date();
  await existingCompany.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_company',
    entityType: 'Company',
    entityId: existingCompany._id as mongoose.Types.ObjectId,
    details: { razonSocial: existingCompany.razonSocial },
  });
}
