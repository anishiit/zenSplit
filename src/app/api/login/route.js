
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure your SMTP credentials in environment variables for security
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your OTP for Login',
    text: `Your OTP is: ${otp}`,
  };
  await transporter.sendMail(mailOptions);
}

// In-memory store for OTPs (for demo only, use DB/Redis in production)
const otpStore = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  const { email, otp, action } = await req.json();

  if (action === 'send_otp') {
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' });
    }
    const generatedOtp = generateOtp();
    otpStore[email] = generatedOtp;
    try {
      await sendOtpEmail(email, generatedOtp);
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Failed to send OTP email', error: e.message });
    }
    return NextResponse.json({ success: true, message: 'OTP sent' });
  }

  if (action === 'verify_otp') {
    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP are required' });
    }
    if (otpStore[email] === otp) {
      delete otpStore[email];
      // TODO: Set session/cookie
      return NextResponse.json({ success: true, message: 'Login successful' });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid OTP' });
    }
  }

  return NextResponse.json({ success: false, message: 'Invalid action' });
}
