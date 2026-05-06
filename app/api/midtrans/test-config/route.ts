// Test endpoint to check Midtrans configuration
import { NextResponse } from 'next/server';

export async function GET() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  
  return NextResponse.json({
    success: true,
    data: {
      hasServerKey: !!serverKey,
      serverKeyPrefix: serverKey.substring(0, 15) + '...',
      hasClientKey: !!clientKey,
      clientKeyPrefix: clientKey.substring(0, 15) + '...',
      isProduction,
      environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
    },
    message: 'Midtrans configuration check',
  });
}
