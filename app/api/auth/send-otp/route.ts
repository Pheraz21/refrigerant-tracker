import { Resend } from 'resend';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    const payload = `${email}:${code}:${expires}`;
    const sig = crypto
      .createHmac('sha256', process.env.OTP_SECRET || 'dev-secret')
      .update(payload)
      .digest('hex');
    const token = Buffer.from(JSON.stringify({ email, code, expires, sig })).toString('base64url');

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your 21 Degrees registration code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #111;">Your verification code</h2>
          <p style="color: #444;">Use this code to complete your 21 Degrees account registration:</p>
          <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.3rem; color: #111; background: #f4f4f4; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 1.5rem 0;">
            ${code}
          </div>
          <p style="color: #888; font-size: 0.85rem;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    });

    return NextResponse.json({ token });
  } catch (err: any) {
    console.error('send-otp error:', err);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
