'use server';

import { connectToDatabase } from '../database/mongodb';
import { createCompany } from '../services/companyService';
import { revalidatePath } from 'next/cache';

export async function createCompanyAction(data: any) {
  try {
    await connectToDatabase();
    
    // Clean empty values to prevent schema matching errors
    const cleanedData: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        cleanedData[key] = data[key];
      }
    });

    const company = await createCompany(cleanedData);

    revalidatePath('/dashboard/companies');
    revalidatePath('/dashboard/kanban');

    return { success: true, id: company._id.toString() };
  } catch (error: any) {
    console.error('Error in createCompanyAction:', error);
    return { success: false, error: error.message || 'Error al guardar la empresa' };
  }
}
