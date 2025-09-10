
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
    subject: 'Your OTP for Signup',
    text: `Your OTP is: ${otp}`,
  };
  await transporter.sendMail(mailOptions);
}

// In-memory store for OTPs and users (for demo only, use DB in production)
const otpStore = {};
const users = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  const { email, upi, otp, action } = await req.json();

  if (action === 'send_otp') {
    if (!email || !upi) {
      return NextResponse.json({ success: false, message: 'Email and UPI ID are required' });
    }
    const generatedOtp = generateOtp();
    otpStore[email] = { otp: generatedOtp, upi };
    try {
      await sendOtpEmail(email, generatedOtp);
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Failed to send OTP email', error: e.message });
    }
    return NextResponse.json({ success: true, message: 'OTP sent' });
  }

  if (action === 'verify_otp') {
    if (!email || !upi || !otp) {
      return NextResponse.json({ success: false, message: 'All fields are required' });
    }
    if (otpStore[email] && otpStore[email].otp === otp && otpStore[email].upi === upi) {
      users[email] = { email, upi };
      delete otpStore[email];
      // TODO: Save user to DB
      return NextResponse.json({ success: true, message: 'Signup successful' });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid OTP or UPI ID' });
    }
  }

  return NextResponse.json({ success: false, message: 'Invalid action' });
}
