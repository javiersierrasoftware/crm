import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/server/database/mongodb';
import { CampaignRecipient, Campaign, EmailEvent } from '@/models/Campaign';
import Unsubscribe from '@/models/Unsubscribe';
import Contact from '@/models/Contact';

interface ResendWebhookPayload {
  created_at: string;
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained';
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    hooks_payload_url?: string;
    // click / open specific data
    click_target_url?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const payload = (await req.json()) as ResendWebhookPayload;

    if (!payload || !payload.type || !payload.data?.email_id) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const { type, data } = payload;
    const messageId = data.email_id;
    const recipientEmail = data.to[0]?.toLowerCase().trim();

    // 1. Find the campaign recipient using the Resend message ID
    // Note: When sending, Resend returns an ID which we store in the CampaignRecipient's error or logs,
    // or we map by query search. Let's lookup recipient by email and campaign sending status
    // since we may not have mapped the Resend id synchronously on dispatch.
    // In our sender.ts, we returned the message ID. Let's make sure we log this properly.
    const recipient = await CampaignRecipient.findOne({
      email: recipientEmail,
      status: 'sent',
    }).sort({ sentAt: -1 });

    if (!recipient) {
      return NextResponse.json({ message: 'Destinatario no encontrado' }, { status: 200 });
    }

    const organizationId = recipient.organizationId;
    const campaignId = recipient.campaignId;

    // 2. Handle specific email event types
    if (type === 'email.delivered') {
      // Update recipient state
      recipient.status = 'sent';
      await recipient.save();
    }

    else if (type === 'email.opened') {
      const alreadyOpened = await EmailEvent.findOne({
        recipientId: recipient._id,
        type: 'open',
      });

      if (!alreadyOpened) {
        await EmailEvent.create({
          organizationId,
          campaignId,
          recipientId: recipient._id,
          contactId: recipient.contactId,
          email: recipientEmail,
          type: 'open',
          timestamp: new Date(),
        });

        await Campaign.findByIdAndUpdate(campaignId, { $inc: { openedCount: 1 } });
      }
    }

    else if (type === 'email.clicked' && data.click_target_url) {
      const alreadyClicked = await EmailEvent.findOne({
        recipientId: recipient._id,
        type: 'click',
        url: data.click_target_url,
      });

      if (!alreadyClicked) {
        await EmailEvent.create({
          organizationId,
          campaignId,
          recipientId: recipient._id,
          contactId: recipient.contactId,
          email: recipientEmail,
          type: 'click',
          url: data.click_target_url,
          timestamp: new Date(),
        });

        await Campaign.findByIdAndUpdate(campaignId, { $inc: { clickedCount: 1 } });
      }
    }

    else if (type === 'email.bounced') {
      recipient.status = 'bounced';
      recipient.error = 'Rebote permanente reportado por el proveedor';
      await recipient.save();

      await Campaign.findByIdAndUpdate(campaignId, { $inc: { bouncedCount: 1 } });

      // Automatically add to suppression list
      await Unsubscribe.findOneAndUpdate(
        { organizationId, email: recipientEmail },
        { organizationId, email: recipientEmail, reason: 'bounce', campaignId },
        { upsert: true, new: true }
      );

      // Disable email delivery in Contact settings
      await Contact.updateMany(
        { organizationId, email: recipientEmail },
        { subscriptionStatus: 'bounced', commercialConsent: false }
      );
    }

    else if (type === 'email.complained') {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { unsubscribedCount: 1 } }); // Increment complaints/opt-out count

      // Automatically add to suppression list (complaint)
      await Unsubscribe.findOneAndUpdate(
        { organizationId, email: recipientEmail },
        { organizationId, email: recipientEmail, reason: 'complaint', campaignId },
        { upsert: true, new: true }
      );

      // Disable email delivery in Contact settings
      await Contact.updateMany(
        { organizationId, email: recipientEmail },
        { subscriptionStatus: 'unsubscribed', commercialConsent: false }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
