import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/server/database/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt database connection check
    await connectToDatabase();
    
    const dbState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isConnected = dbState === 1;

    if (!isConnected) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          readyState: dbState,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: error.message || 'Error de conexión a la base de datos',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
