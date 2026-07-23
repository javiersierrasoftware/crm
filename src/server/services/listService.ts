import { List, ListMember } from '@/models/List';
import Contact, { IContact } from '@/models/Contact';
import Company from '@/models/Company';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { listSchema } from '@/schemas/list';
import mongoose from 'mongoose';

/**
 * Creates a new static or dynamic segment list.
 */
export async function createList(data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = listSchema.parse(data);

  const list = new List({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  const saved = await list.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_list',
    entityType: 'List',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, type: saved.type },
  });

  return saved;
}

export async function updateList(id: string, data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const list = await List.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!list) {
    throw new Error('Lista no encontrada');
  }

  const parsed = listSchema.parse(data);

  Object.assign(list, parsed);
  const updated = await list.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_list',
    entityType: 'List',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { name: updated.name, type: updated.type },
  });

  return updated;
}

export async function deleteList(id: string) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const list = await List.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!list) {
    throw new Error('Lista no encontrada');
  }

  // Delete list itself
  await List.deleteOne({ _id: id });
  // Clean up static member connections
  await ListMember.deleteMany({ listId: id });

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_list',
    entityType: 'List',
    entityId: list._id as mongoose.Types.ObjectId,
    details: { name: list.name },
  });
}

/**
 * Adds contacts manually to a static list.
 */
export async function addContactsToList(listId: string, contactIds: string[]) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Verify list existence & type
  const list = await List.findOne({
    _id: listId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!list) throw new Error('Lista no encontrada');
  if (list.type !== 'static') throw new Error('Solo se pueden agregar contactos a listas estáticas');

  const membersToInsert = contactIds.map((cid) => ({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    listId: new mongoose.Types.ObjectId(listId),
    contactId: new mongoose.Types.ObjectId(cid),
  }));

  // Batch insert, ignore duplicates
  let addedCount = 0;
  for (const member of membersToInsert) {
    try {
      await ListMember.create(member);
      addedCount++;
    } catch {
      // Ignore duplicates (unique index constraint)
    }
  }

  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'add_members_to_list',
    entityType: 'List',
    entityId: list._id as mongoose.Types.ObjectId,
    details: { name: list.name, count: addedCount },
  });

  return { addedCount };
}

/**
 * Removes contacts manually from a static list.
 */
export async function removeContactsFromList(listId: string, contactIds: string[]) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const list = await List.findOne({
    _id: listId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!list) throw new Error('Lista no encontrada');
  if (list.type !== 'static') throw new Error('Solo se pueden eliminar contactos de listas estáticas');

  const objContactIds = contactIds.map((id) => new mongoose.Types.ObjectId(id));

  const result = await ListMember.deleteMany({
    listId: new mongoose.Types.ObjectId(listId),
    contactId: { $in: objContactIds },
  });

  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'remove_members_from_list',
    entityType: 'List',
    entityId: list._id as mongoose.Types.ObjectId,
    details: { name: list.name, count: result.deletedCount },
  });

  return { removedCount: result.deletedCount };
}

/**
 * Evaluates rules for dynamic lists or collects entries for static lists,
 * returning contacts belonging to the list.
 */
export async function resolveListContacts(listId: string): Promise<IContact[]> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const list = await List.findOne({
    _id: listId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!list) {
    throw new Error('Lista no encontrada');
  }

  // 1. Static list resolver
  if (list.type === 'static') {
    const members = await ListMember.find({
      listId: list._id,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });
    const contactIds = members.map((m) => m.contactId);
    return await Contact.find({
      _id: { $in: contactIds },
      deletedAt: null,
    });
  }

  // 2. Dynamic list segment query compiler
  const rules = list.rules || [];
  if (rules.length === 0) {
    return [];
  }

  const conditions: any[] = [];
  const orgObjId = new mongoose.Types.ObjectId(organizationId);

  for (const rule of rules) {
    let field = rule.field;
    const operator = rule.operator;
    const value = rule.value;

    let condition: Record<string, any> = {};

    // Check if the condition targets a linked company attribute
    if (field.startsWith('company.')) {
      const companyField = field.replace('company.', '');
      const companyQuery: Record<string, any> = {
        organizationId: orgObjId,
        deletedAt: null,
      };

      // Compile the sub-query for the Company collection
      if (operator === 'equals') {
        companyQuery[companyField] = value;
      } else if (operator === 'not_equals') {
        companyQuery[companyField] = { $ne: value };
      } else if (operator === 'contains') {
        companyQuery[companyField] = new RegExp(value, 'i');
      } else if (operator === 'in') {
        companyQuery[companyField] = { $in: Array.isArray(value) ? value : [value] };
      } else if (operator === 'not_in') {
        companyQuery[companyField] = { $nin: Array.isArray(value) ? value : [value] };
      }

      const matchingCompanies = await Company.find(companyQuery).select('_id');
      const companyIds = matchingCompanies.map((c) => c._id);

      // Map to contact search
      condition = { companyId: { $in: companyIds } };
    } else {
      // Compile direct contact schema filter
      if (operator === 'equals') {
        condition[field] = value;
      } else if (operator === 'not_equals') {
        condition[field] = { $ne: value };
      } else if (operator === 'contains') {
        condition[field] = new RegExp(value, 'i');
      } else if (operator === 'in') {
        condition[field] = { $in: Array.isArray(value) ? value : [value] };
      } else if (operator === 'not_in') {
        condition[field] = { $nin: Array.isArray(value) ? value : [value] };
      } else if (operator === 'greater_than') {
        condition[field] = { $gt: value };
      } else if (operator === 'less_than') {
        condition[field] = { $lt: value };
      }
    }

    conditions.push(condition);
  }

  // Combine conditions with dynamic logic operators (AND or OR)
  const combinedConditions =
    list.rulesOperator === 'OR' ? { $or: conditions } : { $and: conditions };

  const finalQuery = {
    organizationId: orgObjId,
    deletedAt: null,
    ...combinedConditions,
  };

  return await Contact.find(finalQuery).populate('companyId', 'commercialName legalName');
}

/**
 * Returns all lists for the active organization, including their total member estimates.
 */
export async function getLists() {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const lists = await List.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ createdAt: -1 });

  // Resolve and append contact count estimates
  const results = [];
  for (const list of lists) {
    let count = 0;
    try {
      if (list.type === 'static') {
        count = await ListMember.countDocuments({ listId: list._id });
      } else {
        const resolved = await resolveListContacts(list._id.toString());
        count = resolved.length;
      }
    } catch {
      // Ignore evaluation crashes (e.g. invalid fields)
    }

    results.push({
      ...list.toObject(),
      memberCount: count,
    });
  }

  return results;
}
