import Contact, { IContact } from '@/models/Contact';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { contactSchema } from '@/schemas/contact';
import mongoose from 'mongoose';

interface GetContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  status?: string;
  tag?: string;
  isPrimary?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getContacts(params: GetContactsParams) {
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
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  // Value filters
  if (params.companyId) {
    query.companyId = params.companyId === 'none' ? null : new mongoose.Types.ObjectId(params.companyId);
  }
  if (params.status) {
    query.status = params.status;
  }
  if (params.tag) {
    query.tags = params.tag;
  }
  if (params.isPrimary !== undefined) {
    query.isPrimary = params.isPrimary;
  }

  // Sorting
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
  const sort: Record<string, any> = { [sortBy]: sortOrder };

  const total = await Contact.countDocuments(query);
  const contacts = await Contact.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('companyId', 'commercialName legalName');

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getContactById(id: string): Promise<IContact> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const contact = await Contact.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  }).populate('companyId', 'commercialName legalName');

  if (!contact) {
    throw new Error('Contacto no encontrado o no pertenece a su organización');
  }

  return contact;
}

export async function checkContactDuplicate(params: { email: string; excludeId?: string }) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const query: Record<string, any> = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    email: params.email.trim().toLowerCase(),
    deletedAt: null,
  };

  if (params.excludeId) {
    query._id = { $ne: new mongoose.Types.ObjectId(params.excludeId) };
  }

  const existing = await Contact.findOne(query);

  if (existing) {
    return {
      duplicate: true,
      contactName: `${existing.firstName} ${existing.lastName}`,
    };
  }

  return { duplicate: false };
}

export async function createContact(data: any): Promise<IContact> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Validate fields
  const parsed = contactSchema.parse(data);

  // Check email duplicate
  const dupCheck = await checkContactDuplicate({ email: parsed.email });
  if (dupCheck.duplicate) {
    throw new Error(
      `Duplicado detectado: Ya existe un contacto con el correo electrónico ${parsed.email} (${dupCheck.contactName})`
    );
  }

  // If this is set as primary contact for the company, reset others
  if (parsed.isPrimary && parsed.companyId) {
    await Contact.updateMany(
      {
        companyId: new mongoose.Types.ObjectId(parsed.companyId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      { isPrimary: false }
    );
  }

  // Build document
  const contactDoc = new Contact({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    companyId: parsed.companyId ? new mongoose.Types.ObjectId(parsed.companyId) : null,
    consentDate: parsed.commercialConsent ? parsed.consentDate || new Date() : undefined,
  });

  const saved = await contactDoc.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_contact',
    entityType: 'Contact',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { email: saved.email, name: `${saved.firstName} ${saved.lastName}` },
  });

  return saved;
}

export async function updateContact(id: string, data: any): Promise<IContact> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const existingContact = await Contact.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!existingContact) {
    throw new Error('Contacto no encontrado o no pertenece a su organización');
  }

  // Validate fields
  const parsed = contactSchema.parse(data);

  // Check duplicate
  const dupCheck = await checkContactDuplicate({ email: parsed.email, excludeId: id });
  if (dupCheck.duplicate) {
    throw new Error(
      `Duplicado detectado: Ya existe otro contacto con el correo electrónico ${parsed.email} (${dupCheck.contactName})`
    );
  }

  // If set to primary contact, reset others in the same company
  if (parsed.isPrimary && parsed.companyId) {
    await Contact.updateMany(
      {
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        companyId: new mongoose.Types.ObjectId(parsed.companyId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      { isPrimary: false }
    );
  }

  // Check if consent status changed to update consentDate
  let consentDate = parsed.consentDate;
  if (parsed.commercialConsent && !existingContact.commercialConsent) {
    consentDate = new Date();
  }

  // Update properties
  Object.assign(existingContact, {
    ...parsed,
    companyId: parsed.companyId ? new mongoose.Types.ObjectId(parsed.companyId) : null,
    consentDate: parsed.commercialConsent ? consentDate || new Date() : undefined,
  });

  const updated = await existingContact.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_contact',
    entityType: 'Contact',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { email: updated.email, name: `${updated.firstName} ${updated.lastName}` },
  });

  return updated;
}

export async function deleteContact(id: string): Promise<void> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const existingContact = await Contact.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!existingContact) {
    throw new Error('Contacto no encontrado o no pertenece a su organización');
  }

  // Soft delete
  existingContact.deletedAt = new Date();
  await existingContact.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_contact',
    entityType: 'Contact',
    entityId: existingContact._id as mongoose.Types.ObjectId,
    details: { email: existingContact.email, name: `${existingContact.firstName} ${existingContact.lastName}` },
  });
}
