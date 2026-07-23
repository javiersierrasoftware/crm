'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import Contact from '@/models/Contact';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface CreateContactParams {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  companyId?: string; // Optional company association
  commercialConsent: boolean;
  subscriptionStatus: 'subscribed' | 'unsubscribed';
}

export async function createContactAction(params: CreateContactParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!params.firstName || !params.lastName || !params.email) {
      return { success: false, error: 'Nombre, Apellido y Correo son campos obligatorios' };
    }

    await connectToDatabase();

    const contact = new Contact({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      companyId: params.companyId ? new mongoose.Types.ObjectId(params.companyId) : null,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email.toLowerCase().trim(),
      phone: params.phone || '',
      position: params.position || '',
      department: params.department || '',
      commercialConsent: !!params.commercialConsent,
      consentDate: params.commercialConsent ? new Date() : undefined,
      consentChannel: params.commercialConsent ? 'Direct Registration' : undefined,
      subscriptionStatus: params.subscriptionStatus || 'subscribed',
      status: 'active',
    });

    await contact.save();

    revalidatePath('/dashboard/contacts');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return { success: false, error: error.message || 'Error al guardar el contacto comercial' };
  }
}
