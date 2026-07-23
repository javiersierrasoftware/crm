import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/server/database/mongodb';
import { getTenantContext } from '@/server/permissions/tenant';
import { createImportJob } from '@/server/services/importService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No se encuentra en un contexto de organización activo' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingStr = formData.get('mapping') as string;
    const duplicateStrategy = formData.get('duplicateStrategy') as 'skip' | 'update' | 'create_new';

    if (!file || !mappingStr || !duplicateStrategy) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos para la importación' },
        { status: 400 }
      );
    }

    const mapping = JSON.parse(mappingStr);
    const rawCsvData = await file.text();

    const job = await createImportJob(
      {
        fileName: file.name,
        mapping,
        duplicateStrategy,
        dataSource: 'Importación Web API',
      },
      rawCsvData
    );

    return NextResponse.json({
      success: true,
      jobId: job._id.toString(),
    });
  } catch (error: any) {
    console.error('Error in API import route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno al procesar importación' },
      { status: 500 }
    );
  }
}
