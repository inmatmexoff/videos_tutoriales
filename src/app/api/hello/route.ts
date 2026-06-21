
import { NextResponse } from 'next/server';

/**
 * GET /api/hello
 * Returns a JSON response with the message 'Hola mundo'
 */
export async function GET() {
  return NextResponse.json(
    { message: 'Hola mundo' },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
