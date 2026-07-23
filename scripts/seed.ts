import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import Organization from '../src/models/Organization';
import OrganizationMember from '../src/models/OrganizationMember';
import Plan from '../src/models/Plan';
import Subscription from '../src/models/Subscription';
import Company from '../src/models/Company';
import Contact from '../src/models/Contact';
import Pipeline from '../src/models/Pipeline';
import { Opportunity, OpportunityHistory } from '../src/models/Opportunity';
import Activity from '../src/models/Activity';
import EmailTemplate from '../src/models/EmailTemplate';
import { Campaign, CampaignRecipient, EmailEvent } from '../src/models/Campaign';
import Unsubscribe from '../src/models/Unsubscribe';
import { Automation } from '../src/models/Automation';
import { seedDefaultTemplates } from '../src/server/services/templateService';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/creatix_crm';

async function seed() {
  console.log('==================================================');
  console.log('      CREATIX-CRM: SEMBRANDO DATOS DE PRUEBA      ');
  console.log('==================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB para el sembrado.');

    // 1. Clear existing database collections
    console.log('\n[PASO 1] Limpiando colecciones existentes...');
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      OrganizationMember.deleteMany({}),
      Plan.deleteMany({}),
      Subscription.deleteMany({}),
      Company.deleteMany({}),
      Contact.deleteMany({}),
      Pipeline.deleteMany({}),
      Opportunity.deleteMany({}),
      OpportunityHistory.deleteMany({}),
      Activity.deleteMany({}),
      EmailTemplate.deleteMany({}),
      Campaign.deleteMany({}),
      CampaignRecipient.deleteMany({}),
      EmailEvent.deleteMany({}),
      Unsubscribe.deleteMany({}),
      Automation.deleteMany({}),
    ]);
    console.log('  ✓ Limpieza de colecciones completada.');

    // 2. Create Plans
    console.log('\n[PASO 2] Creando planes de suscripción...');
    const planInicial = await Plan.create({
      name: 'Plan Inicial',
      code: 'PLAN_INICIAL',
      maxUsers: 3,
      maxCompanies: 5000,
      maxContacts: 10000,
      maxEmailsPerMonth: 5000,
      maxAutomations: 5,
      features: ['reports_basic'],
      price: 29,
    });

    const planProfesional = await Plan.create({
      name: 'Plan Profesional',
      code: 'PLAN_PROFESIONAL',
      maxUsers: 10,
      maxCompanies: 25000,
      maxContacts: 50000,
      maxEmailsPerMonth: 30000,
      maxAutomations: 15,
      features: ['reports_advanced', 'custom_fields', 'integrations'],
      price: 79,
    });

    const planEmpresarial = await Plan.create({
      name: 'Plan Empresarial',
      code: 'PLAN_EMPRESARIAL',
      maxUsers: 999,
      maxCompanies: 999999,
      maxContacts: 999999,
      maxEmailsPerMonth: 500000,
      maxAutomations: 100,
      features: ['reports_advanced', 'custom_fields', 'integrations', 'priority_support', 'audit_logs'],
      price: 249,
    });
    console.log('  ✓ Planes creados: Plan Inicial, Plan Profesional, Plan Empresarial.');

    // 3. Create Super Admin
    console.log('\n[PASO 3] Creando usuario SUPER_ADMIN global...');
    const hashedAdminPassword = await bcrypt.hash('AdminPassword123!', 10);
    const superAdmin = await User.create({
      name: 'Super Administrador CREATIX',
      email: 'admin@creatix-crm.com',
      passwordHash: hashedAdminPassword,
      status: 'active',
      isSuperAdmin: true,
      emailVerified: new Date(),
    });
    console.log(`  ✓ SUPER_ADMIN creado: email: 'admin@creatix-crm.com' / clave: 'AdminPassword123!'`);

    // 4. Create Organizations & Owners
    console.log('\n[PASO 4] Creando organizaciones de prueba (Alfa y Beta)...');
    const orgAlfa = await Organization.create({
      name: 'Corporación Alfa S.A.S.',
      taxId: 'NIT-901234567-1',
      taxType: 'NIT',
      sector: 'Tecnología',
      country: 'Colombia',
      city: 'Bogotá',
      address: 'Calle 100 # 15-20',
      phone: '+57 300 123 4567',
      website: 'https://alfa-corporacion.com',
      status: 'active',
    });

    const orgBeta = await Organization.create({
      name: 'Logística Beta Ltda.',
      taxId: 'NIT-800765432-9',
      taxType: 'NIT',
      sector: 'Servicios',
      country: 'México',
      city: 'Ciudad de México',
      address: 'Av. Reforma 450',
      phone: '+52 55 9876 5432',
      website: 'https://beta-logistica.mx',
      status: 'active',
    });

    // Create subscriptions for Orgs
    await Subscription.create({
      organizationId: orgAlfa._id,
      planId: planProfesional._id,
      status: 'active',
      emailsSentThisPeriod: 1200,
    });

    await Subscription.create({
      organizationId: orgBeta._id,
      planId: planInicial._id,
      status: 'active',
      emailsSentThisPeriod: 350,
    });

    const hashedUserPassword = await bcrypt.hash('UserPassword123!', 10);

    // Create Owner Users
    const ownerAlfa = await User.create({
      name: 'Alejandro Gomez',
      email: 'owner@alfa.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    const ownerBeta = await User.create({
      name: 'Beatriz Salazar',
      email: 'owner@beta.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    // Assign owner memberships
    await OrganizationMember.create({
      organizationId: orgAlfa._id,
      userId: ownerAlfa._id,
      role: 'OWNER',
      status: 'active',
      joinedAt: new Date(),
    });

    await OrganizationMember.create({
      organizationId: orgBeta._id,
      userId: ownerBeta._id,
      role: 'OWNER',
      status: 'active',
      joinedAt: new Date(),
    });

    // Create additional employees for Org Alfa (Admin, Sales Manager, Sales Agent, Marketing)
    const adminAlfa = await User.create({
      name: 'Adelaida Pérez',
      email: 'admin@alfa.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    const managerAlfa = await User.create({
      name: 'Mateo Reyes',
      email: 'sales.manager@alfa.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    const agentAlfa = await User.create({
      name: 'Andrés López',
      email: 'sales.agent@alfa.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    const marketingAlfa = await User.create({
      name: 'Mariana Duarte',
      email: 'marketing@alfa.com',
      passwordHash: hashedUserPassword,
      status: 'active',
      emailVerified: new Date(),
    });

    await OrganizationMember.insertMany([
      { organizationId: orgAlfa._id, userId: adminAlfa._id, role: 'ADMIN', status: 'active', joinedAt: new Date() },
      { organizationId: orgAlfa._id, userId: managerAlfa._id, role: 'SALES_MANAGER', status: 'active', joinedAt: new Date() },
      { organizationId: orgAlfa._id, userId: agentAlfa._id, role: 'SALES_AGENT', status: 'active', joinedAt: new Date() },
      { organizationId: orgAlfa._id, userId: marketingAlfa._id, role: 'MARKETING', status: 'active', joinedAt: new Date() },
    ]);

    console.log('  ✓ Organizaciones Alfa y Beta registradas con sus respectivos dueños y colaboradores.');
    console.log(`    - Credenciales Alfa OWNER: 'owner@alfa.com' / 'UserPassword123!'`);
    console.log(`    - Credenciales Alfa ASESOR: 'sales.agent@alfa.com' / 'UserPassword123!'`);

    // 5. Seed Pipeline and Stages for Org Alfa
    console.log('\n[PASO 5] Configurando embudo de ventas...');
    const defaultStages = [
      { name: 'Nuevo prospecto', key: 'new', order: 0, winProbability: 10 },
      { name: 'Contactado', key: 'contacted', order: 1, winProbability: 20 },
      { name: 'Calificado', key: 'qualified', order: 2, winProbability: 40 },
      { name: 'Reunión programada', key: 'meeting', order: 3, winProbability: 60 },
      { name: 'Propuesta enviada', key: 'proposal', order: 4, winProbability: 80 },
      { name: 'Negociación', key: 'negotiating', order: 5, winProbability: 90 },
      { name: 'Ganada', key: 'won', order: 6, winProbability: 100 },
      { name: 'Perdida', key: 'lost', order: 7, winProbability: 0 },
    ].map((s) => ({
      _id: new mongoose.Types.ObjectId(),
      ...s,
    }));

    const pipelineAlfa = await Pipeline.create({
      organizationId: orgAlfa._id,
      name: 'Embudo de Ventas Principal',
      isDefault: true,
      stages: defaultStages,
    });
    console.log('  ✓ Embudo de ventas configurado con 8 etapas estándar.');

    // 6. Create Companies for Org Alfa
    console.log('\n[PASO 6] Creando empresas prospecto en Org Alfa...');
    const comp1 = await Company.create({
      organizationId: orgAlfa._id,
      razonSocial: 'Tecnologías Globales Inc.',
      legalName: 'Tecnologías Globales de Colombia S.A.S.',
      nit: 'NIT-900456123-2',
      taxType: 'NIT',
      actividad: 'Tecnología',
      subsector: 'Desarrollo de Software',
      size: 'medium',
      estimatedEmployees: 120,
      country: 'Colombia',
      state: 'Cundinamarca',
      munComercial: 'Bogotá',
      telCom1: '+57 311 999 8888',
      emailComercial: 'contacto@globaltech.com',
      website: 'https://globaltech.com',
      status: 'interested',
      assignedAgentId: agentAlfa._id,
      tags: ['SaaS', 'Gran Cuenta'],
      interestLevel: 'high',
      leadScore: 85,
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
    });

    const comp2 = await Company.create({
      organizationId: orgAlfa._id,
      razonSocial: 'Distribuidora del Norte',
      legalName: 'Comercializadora de Alimentos Ltda.',
      nit: 'NIT-800111222-3',
      taxType: 'NIT',
      actividad: 'Retail',
      subsector: 'Supermercados',
      size: 'large',
      estimatedEmployees: 450,
      country: 'Colombia',
      state: 'Antioquia',
      munComercial: 'Medellín',
      telCom1: '+57 315 222 3333',
      emailComercial: 'compras@distrinorte.co',
      website: 'https://distrinorte.co',
      status: 'following_up',
      assignedAgentId: agentAlfa._id,
      tags: ['Retail', 'Consumo Masivo'],
      interestLevel: 'medium',
      leadScore: 60,
      commercialConsent: true,
      subscriptionStatus: 'subscribed',
    });

    const comp3 = await Company.create({
      organizationId: orgAlfa._id,
      razonSocial: 'Constructora Hábitat',
      legalName: 'Hábitat & Diseños Asociados S.A.S.',
      nit: 'NIT-901777888-0',
      taxType: 'NIT',
      actividad: 'Construcción',
      subsector: 'Obras Civiles',
      size: 'small',
      estimatedEmployees: 45,
      country: 'Colombia',
      state: 'Valle del Cauca',
      munComercial: 'Cali',
      telCom1: '+57 320 555 4444',
      emailComercial: 'info@habitatconstrucciones.com',
      website: 'https://habitatconstrucciones.com',
      status: 'uncontacted',
      assignedAgentId: agentAlfa._id,
      tags: ['Constructor', 'Inmobiliaria'],
      interestLevel: 'low',
      leadScore: 20,
      commercialConsent: false,
      subscriptionStatus: 'subscribed',
    });
    console.log('  ✓ 3 empresas prospecto creadas en el portafolio.');

    // 7. Create Contacts for Org Alfa
    console.log('\n[PASO 7] Creando contactos vinculados a las empresas...');
    const cont1 = await Contact.create({
      organizationId: orgAlfa._id,
      companyId: comp1._id,
      firstName: 'Carlos',
      lastName: 'Mendoza',
      position: 'Director de TI',
      department: 'Sistemas',
      email: 'carlos.mendoza@globaltech.com',
      phone: '+57 311 999 8881',
      isPrimary: true,
      status: 'active',
      dataSource: 'Registro Directo',
      tags: ['Decisor', 'Técnico'],
      commercialConsent: true,
      consentDate: new Date(),
      consentChannel: 'Formulario Web',
      subscriptionStatus: 'subscribed',
    });

    const cont2 = await Contact.create({
      organizationId: orgAlfa._id,
      companyId: comp2._id,
      firstName: 'Sofía',
      lastName: 'Rincón',
      position: 'Gerente de Compras',
      department: 'Adquisiciones',
      email: 'sofia.rincon@distrinorte.co',
      phone: '+57 315 222 3331',
      isPrimary: true,
      status: 'active',
      dataSource: 'Importación',
      tags: ['Decisor', 'Comercial'],
      commercialConsent: true,
      consentDate: new Date(),
      consentChannel: 'Feria Comercial',
      subscriptionStatus: 'subscribed',
    });

    const cont3 = await Contact.create({
      organizationId: orgAlfa._id,
      companyId: comp3._id,
      firstName: 'Ricardo',
      lastName: 'Franco',
      position: 'Residente de Obra',
      department: 'Operaciones',
      email: 'ricardo.franco@habitatconstrucciones.com',
      phone: '+57 320 555 4441',
      isPrimary: true,
      status: 'active',
      dataSource: 'Registro Directo',
      tags: ['Operativo'],
      commercialConsent: false,
      subscriptionStatus: 'subscribed',
    });

    // Create an unsubscribed contact to test exclusions
    const contUnsub = await Contact.create({
      organizationId: orgAlfa._id,
      companyId: comp1._id,
      firstName: 'Diana',
      lastName: 'Sánchez',
      position: 'Analista de Sistemas',
      department: 'Sistemas',
      email: 'diana.sanchez@globaltech.com',
      phone: '+57 311 999 8882',
      isPrimary: false,
      status: 'active',
      dataSource: 'Registro Directo',
      tags: ['Influenciador'],
      commercialConsent: false,
      subscriptionStatus: 'unsubscribed',
    });

    await Unsubscribe.create({
      organizationId: orgAlfa._id,
      email: 'diana.sanchez@globaltech.com',
      reason: 'unsubscribed',
    });
    console.log('  ✓ 4 contactos sembrados (incluyendo 1 de baja/exclusión).');

    // 8. Create Sales Opportunities in Pipeline
    console.log('\n[PASO 8] Sembrando oportunidades de negocio en el Pipeline...');
    const stageQualified = defaultStages.find((s) => s.key === 'qualified')!;
    const stageNegotiating = defaultStages.find((s) => s.key === 'negotiating')!;
    const stageWon = defaultStages.find((s) => s.key === 'won')!;

    const opp1 = await Opportunity.create({
      organizationId: orgAlfa._id,
      name: 'Adquisición Licencias CRM',
      companyId: comp1._id,
      primaryContactId: cont1._id,
      estimatedValue: 15000,
      probability: stageNegotiating.winProbability,
      pipelineId: pipelineAlfa._id,
      stageId: stageNegotiating._id,
      expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      assignedAgentId: agentAlfa._id,
      status: 'open',
      products: ['Licencia Cloud Standard', 'Servicio de Configuración'],
    });

    const opp2 = await Opportunity.create({
      organizationId: orgAlfa._id,
      name: 'Consultoría TI 2026',
      companyId: comp2._id,
      primaryContactId: cont2._id,
      estimatedValue: 8500,
      probability: stageQualified.winProbability,
      pipelineId: pipelineAlfa._id,
      stageId: stageQualified._id,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      assignedAgentId: agentAlfa._id,
      status: 'open',
      products: ['Auditoría Tecnológica'],
    });

    const opp3 = await Opportunity.create({
      organizationId: orgAlfa._id,
      name: 'Venta Renovación Anual',
      companyId: comp1._id,
      primaryContactId: cont1._id,
      estimatedValue: 4200,
      probability: stageWon.winProbability,
      pipelineId: pipelineAlfa._id,
      stageId: stageWon._id,
      expectedCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      assignedAgentId: agentAlfa._id,
      status: 'won',
      products: ['Licencia Cloud Standard'],
    });

    // Seed Opportunity history logs
    await OpportunityHistory.insertMany([
      { opportunityId: opp1._id, userId: managerAlfa._id, field: 'status', newValue: 'creado' },
      { opportunityId: opp1._id, userId: agentAlfa._id, field: 'stage', oldValue: defaultStages[0]._id.toString(), newValue: stageQualified._id.toString() },
      { opportunityId: opp1._id, userId: agentAlfa._id, field: 'stage', oldValue: stageQualified._id.toString(), newValue: stageNegotiating._id.toString() },
      { opportunityId: opp3._id, userId: agentAlfa._id, field: 'status', oldValue: 'open', newValue: 'won' },
    ]);

    console.log('  ✓ 3 oportunidades sembradas en Kanban con historial de transiciones.');

    // 9. Seed Activities and Tasks
    console.log('\n[PASO 9] Programando tareas y agenda comercial...');
    await Activity.insertMany([
      {
        organizationId: orgAlfa._id,
        title: 'Llamada de seguimiento propuesta',
        description: 'Llamar a Carlos Mendoza para validar cotización enviada.',
        type: 'call',
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        time: '10:00',
        duration: 15,
        assignedAgentId: agentAlfa._id,
        companyId: comp1._id,
        contactId: cont1._id,
        opportunityId: opp1._id,
        status: 'pending',
        priority: 'high',
        reminderSent: false,
      },
      {
        organizationId: orgAlfa._id,
        title: 'Reunión de presentación técnica',
        description: 'Reunión presencial en oficinas de Distribuidora del Norte.',
        type: 'meeting',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        time: '15:30',
        duration: 60,
        assignedAgentId: agentAlfa._id,
        companyId: comp2._id,
        contactId: cont2._id,
        status: 'completed',
        priority: 'medium',
        result: 'Se presentó el demo técnico con éxito. Solicitaron propuesta económica.',
        reminderSent: false,
      },
      {
        organizationId: orgAlfa._id,
        title: 'Enviar portafolio Constructora Hábitat',
        description: 'Enviar folleto PDF por correo.',
        type: 'task',
        date: new Date(),
        status: 'pending',
        priority: 'low',
        companyId: comp3._id,
        contactId: cont3._id,
        reminderSent: false,
      },
    ]);
    console.log('  ✓ Agenda comercial cargada (llamadas, reuniones y tareas pendientes).');

    // 10. Seed Email Templates
    console.log('\n[PASO 10] Sembrando plantillas de correo...');
    // We already have seedDefaultTemplates, let's call it to seed templates for Org Alfa and Beta
    await seedDefaultTemplates(orgAlfa._id.toString());
    await seedDefaultTemplates(orgBeta._id.toString());
    console.log('  ✓ Plantillas de correo por defecto sembradas para los inquilinos.');

    // 11. Seed Campaigns and metrics
    console.log('\n[PASO 11] Cargando campañas de correo históricas y métricas...');
    const campTemplate = await EmailTemplate.findOne({ organizationId: orgAlfa._id });
    
    if (campTemplate) {
      const campaign = await Campaign.create({
        organizationId: orgAlfa._id,
        name: 'Campaña Lanzamiento Q2 - 2026',
        templateId: campTemplate._id,
        senderName: 'Alejandro Gomez',
        senderEmail: 'a.gomez@alfa-corporacion.com',
        status: 'completed',
        sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        totalRecipients: 100,
        deliveredCount: 95,
        openedCount: 45, // 45% opens
        clickedCount: 15, // 15% clicks
        bouncedCount: 3, // 3% bounce
        unsubscribedCount: 2, // 2% unsub
        failedCount: 2,
      });

      // Seed tracking events in log for analytics
      await EmailEvent.insertMany([
        { organizationId: orgAlfa._id, campaignId: campaign._id, contactId: cont1._id, email: cont1.email, type: 'delivered', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { organizationId: orgAlfa._id, campaignId: campaign._id, contactId: cont1._id, email: cont1.email, type: 'open', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000) },
        { organizationId: orgAlfa._id, campaignId: campaign._id, contactId: cont1._id, email: cont1.email, type: 'click', url: 'https://globaltech.com/solution', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000) },
      ]);
    }
    console.log('  ✓ Campaña histórica de marketing y eventos de apertura/clic sembrados.');

    // 12. Seed Workflows
    console.log('\n[PASO 12] Creando flujos de automatización de marketing...');
    const promoTemplate = await EmailTemplate.findOne({ organizationId: orgAlfa._id, name: 'Presentación Comercial' });
    
    await Automation.create({
      organizationId: orgAlfa._id,
      name: 'Flujo de Acogida Prospectos Tecnología',
      triggerType: 'contact_created',
      status: 'active',
      steps: [
        {
          _id: new mongoose.Types.ObjectId(),
          type: 'email',
          order: 0,
          config: {
            templateId: promoTemplate?._id ? promoTemplate._id.toString() : null,
            senderName: 'Andrés López',
            senderEmail: 'sales.agent@alfa.com',
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          type: 'wait',
          order: 1,
          config: {
            delaySeconds: 259200, // 3 days
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          type: 'task',
          order: 2,
          config: {
            title: 'Llamar para verificar interés',
            description: 'El prospecto tecnológico recibió el correo de presentación. Verificar respuesta o agendar llamada.',
            priority: 'medium',
          },
        },
      ],
    });
    console.log('  ✓ Flujo de automatización sembrado con disparadores y retardos.');

    console.log('\n==================================================');
    console.log('      ✓ SEMBRADO COMPLETADO CORRECTAMENTE        ');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ ERROR EN EL SEMBRADO:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
