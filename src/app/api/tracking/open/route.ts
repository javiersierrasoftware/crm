import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/server/database/mongodb';
import { CampaignRecipient, Campaign, EmailEvent } from '@/models/Campaign';
import mongoose from 'mongoose';

// Transparent 1x1 pixel GIF
const pixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get('recipientId');

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return new NextResponse(pixel, {
        headers: { 'Content-Type': 'image/gif' },
      });
    }

    const recipient = await CampaignRecipient.findById(recipientId);
    if (!recipient) {
      return new NextResponse(pixel, {
        headers: { 'Content-Type': 'image/gif' },
      });
    }

    // Check if this recipient already opened the email to track unique opens
    const alreadyOpened = await EmailEvent.findOne({
      recipientId: recipient._id,
      type: 'open',
    });

    if (!alreadyOpened) {
      // Record open event
      const userAgent = req.headers.get('user-agent') || undefined;
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || undefined;

      await EmailEvent.create({
        organizationId: recipient.organizationId,
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        contactId: recipient.contactId,
        email: recipient.email,
        type: 'open',
        userAgent,
        ipAddress,
        timestamp: new Date(),
      });

      // Increment campaign opened count
      await Campaign.findByIdAndUpdate(recipient.campaignId, {
        $inc: { openedCount: 1 },
      });
    }
  } catch (error) {
    console.error('Error tracking email open:', error);
  }

  // Always return the pixel image, even on failure, to avoid email client display issues
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
