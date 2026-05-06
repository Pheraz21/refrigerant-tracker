import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, entered } = await req.json();
    if (!token || !entered) return NextResponse.json({ ok: false, reason: 'missing' });

    const { email, code, expires, sig } = JSON.parse(
      Buffer.from(token, 'base64url').toString()
    );

    if (Date.now() > expires) return NextResponse.json({ ok: false, reason: 'expired' });

    const payload = `${email}:${code}:${expires}`;
    const expected = crypto
      .createHmac('sha256', process.env.OTP_SECRET || 'dev-secret')
      .update(payload)
      .digest('hex');

    if (sig !== expected) return NextResponse.json({ ok: false, reason: 'invalid' });
    if (entered.trim() !== code) return NextResponse.json({ ok: false, reason: 'wrong' });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid' });
  }
}
