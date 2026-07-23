import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Organization from '../src/models/Organization';
import Company from '../src/models/Company';
import Contact from '../src/models/Contact';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/creatix_crm';
const DATA_FILE_PATH = path.join(__dirname, '../external-data.json');

async function runMigration() {
  console.log('==================================================');
  console.log('      CREATIX-CRM: MIGRACIÓN DE DATOS EXTERNOS     ');
  console.log('==================================================\n');

  // 1. Check if external-data.json exists
  if (!fs.existsSync(DATA_FILE_PATH)) {
    console.error(`❌ ERROR: No se encontró el archivo 'external-data.json' en la raíz del proyecto.`);
    console.log(`Por favor, exporta tu colección de MongoDB como JSON, llámala 'external-data.json' y colócala en:`);
    console.log(`${path.resolve(DATA_FILE_PATH)}`);
    console.log(`\nLuego vuelve a ejecutar el comando.`);
    process.exit(1);
  }

  try {
    // 2. Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB:', mongoose.connection.name);

    // 3. Resolve active tenant organization
    // Let's resolve the first active organization (e.g., Corporación Alfa S.A.S. or any created tenant)
    const targetOrg = await Organization.findOne({ status: 'active' });
    if (!targetOrg) {
      console.error('❌ ERROR: No se encontró ninguna organización activa en la base de datos.');
      console.log('Por favor, asegúrate de correr primero el script de seed (npm run seed) o registrar una empresa.');
      process.exit(1);
    }
    const orgId = targetOrg._id;
    console.log(`✓ Empresa destino de importación: "${targetOrg.name}" (ID: ${orgId})`);

    // 4. Read and Parse JSON Data
    console.log('\n[PASO 1] Leyendo archivo external-data.json...');
    const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const records = JSON.parse(rawData);

    if (!Array.isArray(records)) {
      console.error('❌ ERROR: El archivo JSON debe contener un arreglo de objetos (documentos).');
      process.exit(1);
    }
    console.log(`✓ Archivo cargado correctamente: ${records.length} registros detectados.`);

    // 5. Bulk Write Operations
    console.log('\n[PASO 2] Procesando y migrando registros en lotes de alto rendimiento...');
    
    const companyOperations: any[] = [];
    const contactOperations: any[] = [];
    
    let processedCount = 0;
    const batchSize = 1000;

    for (const record of records) {
      const companyId = new mongoose.Types.ObjectId();
      const taxId = record.nit || record.identificacion || `MIG-${Math.floor(100000 + Math.random() * 900000)}`;

      // Map raw data fields to Mongoose schemas
      const companyDoc = {
        _id: companyId,
        organizationId: orgId,
        razonSocial: record.razonSocial || 'Empresa Sin Nombre',
        legalName: record.razonSocial || 'Empresa Sin Nombre',
        nit: taxId.toString().trim(),
        taxType: 'NIT',
        actividad: record.actividad || 'Ferretería/Cerámicas',
        subsector: record.ciiu1 || '',
        dirComercial: record.dirComercial || '',
        munComercial: record.munComercial || '',
        telCom1: record.telCom1 || '',
        emailComercial: record.emailComercial || '',
        status: 'Nuevo',
        leadScore: 10,
        commercialConsent: true,
        subscriptionStatus: 'subscribed',
        deletedAt: null,
        // Custom fields from external MongoDB data
        activoTotal: record.activoTotal || '',
        ciiu1: record.ciiu1 || '',
        ciiu2: record.ciiu2 || '',
        fecMatricula: record.fecMatricula || '',
        fecRenovacion: record.fecRenovacion || '',
        matricula: record.matricula || '',
        ultAnoRen: record.ultAnoRen || '',
        identificacion: record.identificacion || '',
        emailNotificacion: record.emailNotificacion || '',
      };

      companyOperations.push(companyDoc);

      // If contact email is present, map and create the primary contact
      if (record.emailComercial) {
        const fullName = (record.razonSocial || 'Contacto Sin Nombre').trim();
        const parts = fullName.split(' ');
        const firstName = parts[0] || 'Contacto';
        const lastName = parts.slice(1).join(' ') || 'Externo';

        const contactDoc = {
          organizationId: orgId,
          companyId: companyId,
          firstName,
          lastName,
          position: 'Representante Legal',
          email: record.emailComercial.toLowerCase().trim(),
          phone: record.telCom1 || '',
          isPrimary: true,
          status: 'active',
          dataSource: 'Migración Externa',
          commercialConsent: true,
          consentDate: new Date(),
          consentChannel: 'Base de Datos Histórica',
          subscriptionStatus: 'subscribed',
          deletedAt: null,
        };

        contactOperations.push(contactDoc);
      }
    }

    // Perform high performance Bulk Insert
    console.log(`\n  -> Insertando ${companyOperations.length} empresas en MongoDB...`);
    for (let i = 0; i < companyOperations.length; i += batchSize) {
      const batch = companyOperations.slice(i, i + batchSize);
      await Company.insertMany(batch, { ordered: false });
      processedCount += batch.length;
      console.log(`     Lote de empresas: ${processedCount}/${companyOperations.length} completado.`);
    }

    processedCount = 0;
    console.log(`\n  -> Insertando ${contactOperations.length} contactos vinculados...`);
    for (let i = 0; i < contactOperations.length; i += batchSize) {
      const batch = contactOperations.slice(i, i + batchSize);
      await Contact.insertMany(batch, { ordered: false });
      processedCount += batch.length;
      console.log(`     Lote de contactos: ${processedCount}/${contactOperations.length} completado.`);
    }

    console.log('\n==================================================');
    console.log('      ✓ MIGRACIÓN FINALIZADA CON ÉXITO            ');
    console.log(`      Empresas Migradas: ${companyOperations.length}`);
    console.log(`      Contactos Creados: ${contactOperations.length}`);
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runMigration();
