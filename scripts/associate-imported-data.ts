import mongoose from 'mongoose';
import { connectToDatabase } from '../src/server/database/mongodb';
import Company from '../src/models/Company';
import Organization from '../src/models/Organization';

async function main() {
  console.log('[ASOCIAR] Conectando a MongoDB...');
  await connectToDatabase();

  // 1. Find active organization
  const org = await Organization.findOne({ name: 'Corporación Alfa S.A.S.' });
  if (!org) {
    console.error('❌ Error: No se encontró la organización "Corporación Alfa S.A.S.". Asegúrate de haber ejecutado la semilla (seed) primero.');
    process.exit(1);
  }

  const orgId = org._id;
  console.log(`[ASOCIAR] Organización encontrada: "${org.name}" (ID: ${orgId})`);

  // 2. Count documents without organizationId
  const count = await Company.countDocuments({ organizationId: { $exists: false } });
  console.log(`[ASOCIAR] Encontradas ${count} empresas sin organizationId asignado.`);

  if (count === 0) {
    console.log('[ASOCIAR] No hay registros huérfanos que asociar. Todo listo.');
    process.exit(0);
  }

  // 3. Update documents
  console.log('[ASOCIAR] Asociando registros y configurando valores por defecto de CRM...');
  const res = await Company.updateMany(
    { organizationId: { $exists: false } },
    {
      $set: {
        organizationId: orgId,
        deletedAt: null,
        commercialConsent: true,
        subscriptionStatus: 'subscribed',
        leadScore: 10,
        tags: [],
      },
    }
  );

  console.log(`\n✓ Éxito: Se asociaron ${res.modifiedCount} empresas a la organización.`);
  console.log('✓ Todos los registros huérfanos ahora son visibles en la plataforma.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error durante la asociación de datos:', err);
  process.exit(1);
});
