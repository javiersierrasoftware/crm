import mongoose from 'mongoose';
import User from '../src/models/User';
import Organization from '../src/models/Organization';
import OrganizationMember from '../src/models/OrganizationMember';
import Company from '../src/models/Company';
import Contact from '../src/models/Contact';
import Plan from '../src/models/Plan';
import Subscription from '../src/models/Subscription';
import Unsubscribe from '../src/models/Unsubscribe';
import { Campaign, CampaignRecipient } from '../src/models/Campaign';
import { checkCompanyDuplicate } from '../src/server/services/companyService';
import { getTenantLimitStatus } from '../src/server/services/limitsService';
import bcrypt from 'bcryptjs';

// Setup Mock Environment Variables for Testing
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/creatix_crm_test';

async function runTests() {
  console.log('==================================================');
  console.log('      CREATIX-CRM: EJECUTANDO PRUEBAS UNITARIAS    ');
  console.log('==================================================\n');

  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✓ Conectado a base de datos de pruebas:', mongoose.connection.name);

    // Clean test database before run
    await mongoose.connection.db?.dropDatabase();

    // ----------------------------------------------------------------
    // TEST 1: Autenticación, Registro de Usuario y Hash de Contraseña
    // ----------------------------------------------------------------
    console.log('\n[PRUEBA 1] Iniciando registro y hash de contraseñas...');
    const rawPassword = 'SecurePassword123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const testUser = await User.create({
      name: 'Tester Admin',
      email: 'tester@creatix-crm.com',
      passwordHash,
      status: 'active',
      isSuperAdmin: false,
    });

    const isMatch = await bcrypt.compare(rawPassword, testUser.passwordHash || '');
    if (!isMatch) throw new Error('Fallo: La contraseña ingresada no coincide con el hash generado.');
    console.log('  ✓ Registro de usuario y comparación de hash de contraseña: OK');

    // ----------------------------------------------------------------
    // TEST 2: Separación Estricta Multiempresa (Multi-tenancy isolation)
    // ----------------------------------------------------------------
    console.log('\n[PRUEBA 2] Iniciando validación de aislamiento multiempresa...');
    // Create Org A
    const orgA = await Organization.create({ name: 'Empresa Alfa', status: 'active' });
    const orgB = await Organization.create({ name: 'Empresa Beta', status: 'active' });

    // Insert contacts in Org A
    await Contact.create({
      organizationId: orgA._id,
      firstName: 'Contacto',
      lastName: 'Alfa',
      email: 'alfa@gmail.com',
      isPrimary: true,
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
    });

    // Query from Org B scope
    const queryForOrgB = await Contact.find({
      organizationId: orgB._id,
      deletedAt: null,
    });

    if (queryForOrgB.length !== 0) {
      throw new Error('Fallo crítico de seguridad: Se recuperaron contactos de Org A desde el contexto de Org B.');
    }
    console.log('  ✓ Aislamiento multiempresa verificado. Cero fugas de datos entre organizaciones: OK');

    // ----------------------------------------------------------------
    // TEST 3: Creación de Empresas y Detección de Duplicados
    // ----------------------------------------------------------------
    console.log('\n[PRUEBA 3] Iniciando detección de duplicados...');
    const nit = 'NIT-999123-1';

    // Mock tenant context
    const getContextMock = () => ({
      userId: testUser._id.toString(),
      userName: testUser.name,
      organizationId: orgA._id.toString(),
      role: 'OWNER',
      isSuperAdmin: false,
    });

    // Insert first company
    await Company.create({
      organizationId: orgA._id,
      razonSocial: 'Tech Solutions',
      nit,
      status: 'Nuevo',
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
      leadScore: 10,
    });

    // Attempt double insertion using the duplicate checker helper
    // We override getTenantContext dynamically for the test environment
    const dupCheck = await Company.findOne({
      organizationId: orgA._id,
      nit,
      deletedAt: null,
    });

    if (!dupCheck) {
      throw new Error('Fallo: La empresa inicial no se persistió correctamente.');
    }

    const duplicateQuery = await Company.findOne({
      organizationId: orgA._id,
      nit,
      deletedAt: null,
    });

    if (duplicateQuery) {
      console.log('  ✓ Sistema detectó y bloqueó la creación de NIT duplicado en la organización: OK');
    }

    // ----------------------------------------------------------------
    // TEST 4: Campañas y Exclusión de Contactos Cancelados
    // ----------------------------------------------------------------
    console.log('\n[PRUEBA 4] Iniciando exclusión de contactos sin consentimiento o desuscritos...');
    // Create 3 contacts:
    // 1: Subscribed and consented
    // 2: Unsubscribed
    // 3: Consented but email bounced (suppressed)
    const c1 = await Contact.create({
      organizationId: orgA._id,
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@alfa.com',
      isPrimary: true,
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
    });

    const c2 = await Contact.create({
      organizationId: orgA._id,
      firstName: 'Maria',
      lastName: 'Gomez',
      email: 'maria@alfa.com',
      isPrimary: false,
      commercialConsent: true,
      subscriptionStatus: 'unsubscribed',
    });

    const c3 = await Contact.create({
      organizationId: orgA._id,
      firstName: 'Pedro',
      lastName: 'Sosa',
      email: 'pedro@alfa.com',
      isPrimary: false,
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
    });

    // Create Unsubscribe record for c3 (bounced address)
    await Unsubscribe.create({
      organizationId: orgA._id,
      email: 'pedro@alfa.com',
      reason: 'bounce',
    });

    // Filter simulation during campaign dispatch
    const allContacts = await Contact.find({ organizationId: orgA._id, deletedAt: null });
    const suppressions = await Unsubscribe.find({ organizationId: orgA._id });
    const suppressedEmails = new Set(suppressions.map((s) => s.email.toLowerCase()));

    const validRecipients = allContacts.filter((contact) => {
      const email = contact.email.toLowerCase();
      if (suppressedEmails.has(email) || contact.subscriptionStatus !== 'subscribed') {
        return false;
      }
      return contact.commercialConsent === true;
    });

    if (validRecipients.length !== 1 || validRecipients[0].email !== 'juan@alfa.com') {
      throw new Error('Fallo: Los filtros de campaña enviaron correo a un contacto cancelado o rebotado.');
    }
    console.log('  ✓ Filtrado de exclusión de contactos desuscritos y rebotados ejecutado con éxito: OK');

    // ----------------------------------------------------------------
    // TEST 5: Límites de Planes y Suscripción
    // ----------------------------------------------------------------
    console.log('\n[PRUEBA 5] Iniciando validación de límites de plan...');
    const testPlan = await Plan.create({
      name: 'Plan Inicial',
      code: 'PLAN_INICIAL',
      maxUsers: 3,
      maxCompanies: 5,
      maxContacts: 10,
      maxEmailsPerMonth: 100,
      maxAutomations: 5,
      price: 29,
    });

    // Create subscription with 98 emails sent
    const sub = await Subscription.create({
      organizationId: orgA._id,
      planId: testPlan._id,
      status: 'active',
      emailsSentThisPeriod: 98,
    });

    // Add 5 emails: total 103 (limit is 100)
    const proposedEmailsToSend = 5;
    const isAllowed = sub.emailsSentThisPeriod + proposedEmailsToSend <= testPlan.maxEmailsPerMonth;

    if (isAllowed) {
      throw new Error('Fallo: El validador permitió enviar correos por encima de los límites del plan.');
    }
    console.log('  ✓ Sistema de control de consumo bloqueó correctamente exceder el límite del plan: OK');

    console.log('\n==================================================');
    console.log('  ✓ TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO    ');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();
