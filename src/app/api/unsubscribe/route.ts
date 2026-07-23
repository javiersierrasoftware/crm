import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/server/database/mongodb';
import Contact from '@/models/Contact';
import Unsubscribe from '@/models/Unsubscribe';
import { Campaign, EmailEvent } from '@/models/Campaign';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const orgId = searchParams.get('org');
  const campaignId = searchParams.get('camp');

  const errorHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - Desuscripción</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 400px; width: 100%; border: 1px solid #f3f4f6; }
        h1 { color: #dc2626; font-size: 24px; margin-bottom: 16px; }
        p { color: #4b5563; font-size: 15px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Ocurrió un error</h1>
        <p>Los parámetros de desuscripción no son válidos o están incompletos. Póngase en contacto con soporte técnico.</p>
      </div>
    </body>
    </html>
  `;

  if (!email || !orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    return new NextResponse(errorHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    await connectToDatabase();

    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const lowercaseEmail = email.toLowerCase().trim();

    // 1. Check if unsubscribe record already exists
    const existingUnsub = await Unsubscribe.findOne({
      organizationId: orgObjId,
      email: lowercaseEmail,
    });

    if (!existingUnsub) {
      // 2. Insert into suppression list
      await Unsubscribe.create({
        organizationId: orgObjId,
        email: lowercaseEmail,
        reason: 'unsubscribed',
        campaignId: campaignId && mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : null,
      });

      // 3. Mark contact preferences in CRM
      await Contact.updateMany(
        { organizationId: orgObjId, email: lowercaseEmail },
        { subscriptionStatus: 'unsubscribed', commercialConsent: false }
      );

      // 4. Log EmailEvent
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        const campObjId = new mongoose.Types.ObjectId(campaignId);

        // Fetch corresponding contact ID to record the event
        const contact = await Contact.findOne({ organizationId: orgObjId, email: lowercaseEmail });
        if (contact) {
          await EmailEvent.create({
            organizationId: orgObjId,
            campaignId: campObjId,
            contactId: contact._id,
            email: lowercaseEmail,
            type: 'unsubscribe',
            timestamp: new Date(),
          });
        }

        // Increment campaign opt-out metrics
        await Campaign.findByIdAndUpdate(campObjId, {
          $inc: { unsubscribedCount: 1 },
        });
      }
    }

    // Success response HTML page
    const successHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suscripción Cancelada - CREATIX CRM</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%); display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06); text-align: center; max-width: 450px; width: 100%; border: 1px solid #e5e7eb; }
          .icon { width: 64px; height: 64px; background-color: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: #15803d; }
          .check-svg { width: 32px; height: 32px; }
          h1 { color: #111827; font-size: 22px; margin-bottom: 12px; font-weight: 700; }
          p { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .footer { font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">
            <svg class="check-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1>Suscripción cancelada con éxito</h1>
          <p>Tu correo electrónico <strong>${email}</strong> ha sido dado de baja de nuestro boletín. No recibirás más correos publicitarios de esta organización en el futuro.</p>
          <div class="footer">
            CREATIX CRM - Conectando empresas de forma ética y segura.
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return new NextResponse(errorHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
