import { ImportJob, ImportRowError } from '@/models/ImportJob';
import Company, { ICompany } from '@/models/Company';
import Contact from '@/models/Contact';
import { getTenantContext } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import mongoose from 'mongoose';
import Papa from 'papaparse';
import { companySchema } from '@/schemas/company';
import { contactSchema } from '@/schemas/contact';

interface ImportParams {
  fileName: string;
  mapping: Record<string, string>; // e.g. { "Nombre Comercial": "company.commercialName", "NIT": "company.taxId", "Correo Contacto": "contact.email" }
  duplicateStrategy: 'skip' | 'update' | 'create_new';
  defaultAgentId?: string;
  tags?: string[];
  dataSource?: string;
}

/**
 * Initializes a new import job in the database.
 */
export async function createImportJob(params: ImportParams, rawCsvData: string) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Parse CSV initially to count rows
  const parsed = Papa.parse(rawCsvData, { header: true, skipEmptyLines: true });
  const totalRows = parsed.data.length;

  const job = new ImportJob({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    status: 'pending',
    fileName: params.fileName,
    mapping: params.mapping,
    duplicateStrategy: params.duplicateStrategy,
    defaultAgentId: params.defaultAgentId ? new mongoose.Types.ObjectId(params.defaultAgentId) : undefined,
    tags: params.tags || [],
    dataSource: params.dataSource || 'Importación CSV',
    totalRows,
    processedRows: 0,
    createdCount: 0,
    updatedCount: 0,
    failedCount: 0,
    duplicateCount: 0,
  });

  const savedJob = await job.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'initiate_import_job',
    entityType: 'ImportJob',
    entityId: savedJob._id as mongoose.Types.ObjectId,
    details: { fileName: params.fileName, totalRows },
  });

  // Start processing in background (non-blocking)
  // We use process.nextTick or setTimeout to decouple it from the main HTTP thread
  setTimeout(() => {
    processImportJobInBackground(savedJob._id.toString(), parsed.data, context.userId, context.userName);
  }, 10);

  return savedJob;
}

/**
 * Background worker logic for processing an import job in batches.
 */
async function processImportJobInBackground(
  jobId: string,
  rows: any[],
  actorUserId: string,
  actorUserName: string
) {
  const job = await ImportJob.findById(jobId);
  if (!job) return;

  job.status = 'processing';
  await job.save();

  const organizationId = job.organizationId.toString();
  const mapping = job.mapping;
  const duplicateStrategy = job.duplicateStrategy;
  const defaultAgentId = job.defaultAgentId;
  const tags = job.tags || [];
  const dataSource = job.dataSource || 'Importación';

  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  let processedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const csvRow = rows[i];
    const rowNumber = i + 2; // 1-indexed header + 1-indexed row number

    try {
      processedRows++;

      // 1. Map CSV columns to Company and Contact structures
      const companyData: Record<string, any> = {};
      const contactData: Record<string, any> = {};

      Object.entries(mapping).forEach(([csvHeader, crmField]) => {
        const value = csvRow[csvHeader]?.trim();
        if (value === undefined || value === null || value === '') return;

        if (crmField.startsWith('company.')) {
          const fieldName = crmField.replace('company.', '');
          companyData[fieldName] = value;
        } else if (crmField.startsWith('contact.')) {
          const fieldName = crmField.replace('contact.', '');
          contactData[fieldName] = value;
        }
      });

      let company: ICompany | null = null;

      // 2. Process Company details if razonSocial is provided
      if (companyData.razonSocial) {
        // Query if company already exists
        const orgObjId = new mongoose.Types.ObjectId(organizationId);
        const queryConditions: any[] = [];
        if (companyData.nit) {
          queryConditions.push({ nit: companyData.nit });
        }
        if (companyData.emailComercial) {
          queryConditions.push({ emailComercial: companyData.emailComercial.toLowerCase() });
        }
        // Fallback search by razonSocial
        queryConditions.push({ razonSocial: companyData.razonSocial });

        const existingCompany = await Company.findOne({
          organizationId: orgObjId,
          deletedAt: null,
          $or: queryConditions,
        });

        if (existingCompany) {
          if (duplicateStrategy === 'skip') {
            duplicateCount++;
            company = existingCompany;
          } else if (duplicateStrategy === 'update') {
            // Apply updates
            Object.assign(existingCompany, {
              ...companyData,
              tags: Array.from(new Set([...(existingCompany.tags || []), ...tags])),
            });
            company = await existingCompany.save();
            updatedCount++;
          } else {
            // create_new
            const newCompany = new Company({
              ...companyData,
              organizationId: orgObjId,
              assignedAgentId: defaultAgentId,
              tags,
              dataSource,
            });
            company = await newCompany.save();
            createdCount++;
          }
        } else {
          // Company doesn't exist, create it
          const newCompany = new Company({
            ...companyData,
            organizationId: orgObjId,
            assignedAgentId: defaultAgentId,
            tags,
            dataSource,
          });
          company = await newCompany.save();
          createdCount++;
        }
      }

      // 3. Process Contact details if email or name is provided
      const hasContactDetails = contactData.email || contactData.firstName || contactData.lastName;
      if (hasContactDetails) {
        if (!contactData.firstName) contactData.firstName = 'Contacto';
        if (!contactData.lastName) contactData.lastName = 'Importado';

        // Check if contact already exists in this tenant
        let existingContact = null;
        if (contactData.email) {
          existingContact = await Contact.findOne({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            email: contactData.email.toLowerCase(),
            deletedAt: null,
          });
        }

        if (existingContact) {
          if (duplicateStrategy === 'skip') {
            if (!companyData.razonSocial) duplicateCount++;
            // Link contact to company if not already linked
            if (company && !existingContact.companyId) {
              existingContact.companyId = company._id as mongoose.Types.ObjectId;
              await existingContact.save();
            }
          } else if (duplicateStrategy === 'update') {
            Object.assign(existingContact, {
              ...contactData,
              companyId: company ? company._id : existingContact.companyId,
              tags: Array.from(new Set([...(existingContact.tags || []), ...tags])),
            });
            await existingContact.save();
            if (!companyData.razonSocial) updatedCount++;
          } else {
            // create_new
            const newContact = new Contact({
              ...contactData,
              organizationId: new mongoose.Types.ObjectId(organizationId),
              companyId: company ? company._id : null,
              tags,
              dataSource,
            });
            await newContact.save();
            if (!companyData.razonSocial) createdCount++;
          }
        } else {
          // Create new contact
          const newContact = new Contact({
            ...contactData,
            organizationId: new mongoose.Types.ObjectId(organizationId),
            companyId: company ? company._id : null,
            tags,
            dataSource,
          });
          await newContact.save();
          if (!companyData.razonSocial) createdCount++;
        }
      }
    } catch (err: any) {
      failedCount++;
      // Save detailed row error
      await ImportRowError.create({
        organizationId: job.organizationId,
        jobId: job._id,
        rowNumber,
        errorDetails: err.message || 'Error desconocido durante el procesamiento',
        rowData: csvRow,
      });
    }

    // Periodically update progress in DB every 50 rows
    if (processedRows % 50 === 0 || processedRows === rows.length) {
      await ImportJob.findByIdAndUpdate(jobId, {
        processedRows,
        createdCount,
        updatedCount,
        failedCount,
        duplicateCount,
      });
    }
  }

  // Update final status
  job.status = 'completed';
  job.processedRows = processedRows;
  job.createdCount = createdCount;
  job.updatedCount = updatedCount;
  job.failedCount = failedCount;
  job.duplicateCount = duplicateCount;
  await job.save();

  // Audit Log Completion
  await writeAuditLog({
    organizationId,
    userId: actorUserId,
    userName: actorUserName,
    action: 'complete_import_job',
    entityType: 'ImportJob',
    entityId: job._id as mongoose.Types.ObjectId,
    details: {
      fileName: job.fileName,
      totalRows: processedRows,
      created: createdCount,
      updated: updatedCount,
      failed: failedCount,
      duplicates: duplicateCount,
    },
  });
}
