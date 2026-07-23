'use server';

import { connectToDatabase } from '../database/mongodb';
import { createCompany } from '../services/companyService';
import { getTenantContext } from '../permissions/tenant';
import Company from '@/models/Company';
import Organization from '@/models/Organization';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

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

export async function loadTenantDatabaseAction(quantity: number) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No autorizado' };
    }

    await connectToDatabase();

    // 1. Verify subscription and active plan
    const sub = await Subscription.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) }).populate('planId');
    if (!sub || sub.status !== 'active') {
      return { success: false, error: 'Debe tener una suscripción activa para cargar empresas.' };
    }

    const plan = sub.planId as any;
    const maxLimit = plan?.maxCompanies || 5000;
    const loadQty = Math.min(quantity, maxLimit);

    // 2. Check if companies are already loaded for this plan/subscription
    if (sub.companiesLoaded === true) {
      return { success: false, error: 'Su organización ya tiene las empresas cargadas para su plan actual.' };
    }

    // 3. Find the organization's industrial sector
    const org = await Organization.findById(organizationId);
    const sectorName = org?.sector || '';

    // Map sectorName to category search term
    let primaryCategory = 'Otros / Servicios Generales';
    if (sectorName === 'Tecnología') {
      primaryCategory = 'Tecnología y Comunicaciones';
    } else if (sectorName === 'Servicios') {
      primaryCategory = 'Servicios Profesionales';
    } else if (sectorName === 'Retail') {
      primaryCategory = 'Comercio y Variedades';
    } else if (sectorName === 'Construcción') {
      primaryCategory = 'Construcción e Ingeniería';
    } else if (sectorName === 'Manufactura') {
      primaryCategory = 'Alimentos y Bebidas';
    }

    // Helper classification function
    const getCompanyCategory = (actividad: any, ciiu1: any): string => {
      const act = String(actividad || '').toLowerCase();
      const ciiu = String(ciiu1 || '').toLowerCase();
      
      if (act.includes('tecnologia') || act.includes('computador') || act.includes('informatica') || act.includes('software') || act.includes('telecomunicac')) {
        return 'Tecnología y Comunicaciones';
      }
      if (act.includes('calzado') || act.includes('prendas') || act.includes('vestir') || act.includes('moda') || act.includes('textil') || act.includes('cuero')) {
        return 'Moda, Calzado y Textil';
      }
      if (act.includes('ferreteria') || act.includes('construccion') || act.includes('ingenieria') || act.includes('edific') || ciiu.startsWith('f')) {
        return 'Construcción e Ingeniería';
      }
      if (act.includes('alimento') || act.includes('restaurante') || act.includes('comida') || act.includes('bebida') || act.includes('supermercado') || act.includes('viveres') || act.includes('panaderia') || act.includes('reposteria')) {
        return 'Alimentos y Bebidas';
      }
      if (act.includes('salud') || act.includes('medico') || act.includes('farmac') || act.includes('medicinal') || act.includes('clinica') || act.includes('drogueria')) {
        return 'Salud y Farmacia';
      }
      if (act.includes('transporte') || act.includes('carga') || act.includes('vehiculo') || ciiu.startsWith('h')) {
        return 'Transporte y Logística';
      }
      if (act.includes('servicio') || act.includes('asesor') || act.includes('consult') || act.includes('apoyo') || act.includes('educac')) {
        return 'Servicios Profesionales';
      }
      if (act.includes('comercio') || act.includes('variedades') || act.includes('cacharreria') || ciiu.startsWith('g')) {
        return 'Comercio y Variedades';
      }
      return 'Otros / Servicios Generales';
    };

    // 4. Query all master templates from the master pool organization to categorize them
    const masterOrgId = new mongoose.Types.ObjectId('6a614417e8343e87acb328b3');
    const allTemplates = await Company.find({
      organizationId: masterOrgId,
      deletedAt: null,
    }).lean();

    if (allTemplates.length === 0) {
      return { success: false, error: 'No se encontraron empresas en la base de datos global.' };
    }

    const primaryPool: any[] = [];
    const secondaryPool: any[] = [];

    allTemplates.forEach((tpl: any) => {
      const cat = getCompanyCategory(tpl.actividad, tpl.ciiu1);
      tpl.category = cat; // Assign category
      if (cat === primaryCategory) {
        primaryPool.push(tpl);
      } else {
        secondaryPool.push(tpl);
      }
    });

    // Select templates prioritizing primary category first
    const selectedTemplates = primaryPool.slice(0, loadQty);
    if (selectedTemplates.length < loadQty) {
      const needed = loadQty - selectedTemplates.length;
      selectedTemplates.push(...secondaryPool.slice(0, needed));
    }

    // 5. Bulk write copies setting new organizationId
    const newCompanies = selectedTemplates.map((tpl: any) => {
      const copy = { ...tpl };
      delete copy._id;
      delete copy.createdAt;
      delete copy.updatedAt;
      copy.organizationId = new mongoose.Types.ObjectId(organizationId);
      copy.status = 'Nuevo'; // Reset status to default
      return copy;
    });

    await Company.insertMany(newCompanies);

    sub.companiesLoaded = true;
    await sub.save();

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/companies');

    return { success: true, count: newCompanies.length };
  } catch (error: any) {
    console.error('Error loading tenant database:', error);
    return { success: false, error: error.message || 'Error al precargar la base de datos.' };
  }
}
