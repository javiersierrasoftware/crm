import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/server/database/mongodb';
import { CampaignRecipient, Campaign, EmailEvent } from '@/models/Campaign';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recipientId = searchParams.get('recipientId');
  const targetUrl = searchParams.get('url');

  const fallbackRedirect = new URL('/', req.url).toString();

  if (!targetUrl) {
    return NextResponse.redirect(fallbackRedirect);
  }

  try {
    await connectToDatabase();

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return NextResponse.redirect(targetUrl);
    }

    const recipient = await CampaignRecipient.findById(recipientId);
    if (!recipient) {
      return NextResponse.redirect(targetUrl);
    }

    // Check if this recipient already clicked this specific URL to track unique clicks
    const alreadyClicked = await EmailEvent.findOne({
      recipientId: recipient._id,
      type: 'click',
      url: targetUrl,
    });

    if (!alreadyClicked) {
      const userAgent = req.headers.get('user-agent') || undefined;
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || undefined;

      await EmailEvent.create({
        organizationId: recipient.organizationId,
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        contactId: recipient.contactId,
        email: recipient.email,
        type: 'click',
        url: targetUrl,
        userAgent,
        ipAddress,
        timestamp: new Date(),
      });

      // Increment campaign clicked count
      await Campaign.findByIdAndUpdate(recipient.campaignId, {
        $inc: { clickedCount: 1 },
      });
    }
  } catch (error) {
    console.error('Error tracking email click:', error);
  }

  // Always redirect to the intended link
  return NextResponse.redirect(targetUrl);
}
