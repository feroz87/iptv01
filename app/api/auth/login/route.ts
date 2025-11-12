import { NextRequest, NextResponse } from 'next/server';

// Get password from environment variable
// Set this in your hosting platform's environment variables
const CORRECT_PASSWORD = process.env.IPTV_PASSWORD || 'changeme123';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password === CORRECT_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      // Set authentication cookie (expires in 30 days)
      response.cookies.set('iptv-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

