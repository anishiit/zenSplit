
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getDb } from '../../../lib/mongodb';

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

// In-memory store for OTPs (temporary storage for verification)
const otpStore = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  const { email, upi, name, otp, action } = await req.json();

  if (action === 'send_otp') {
    if (!email || !upi) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email and UPI ID are required' 
      });
    }

    try {
      // Check if user already exists
      const db = await getDb();
      const existingUser = await db.collection('users').findOne({ email: email });
      
      if (existingUser) {
        return NextResponse.json({ 
          success: false, 
          message: 'An account with this email already exists. Please login instead.' 
        });
      }

      const generatedOtp = generateOtp();
      otpStore[email] = { otp: generatedOtp, upi, name: name || '', timestamp: Date.now() };
      
      try {
        await sendOtpEmail(email, generatedOtp);
      } catch (e) {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to send OTP email', 
          error: e.message 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'OTP sent to your email' 
      });
    } catch (error) {
      console.error('Signup send_otp error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error occurred',
        error: error.message 
      });
    }
  }

  if (action === 'verify_otp') {
    if (!email || !upi || !otp) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email, UPI ID, and OTP are required' 
      });
    }

    try {
      // Verify OTP
      const storedData = otpStore[email];
      if (!storedData) {
        return NextResponse.json({ 
          success: false, 
          message: 'OTP expired or not found. Please request a new OTP.' 
        });
      }

      // Check if OTP is expired (10 minutes)
      if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
        delete otpStore[email];
        return NextResponse.json({ 
          success: false, 
          message: 'OTP expired. Please request a new OTP.' 
        });
      }

      if (storedData.otp !== otp || storedData.upi !== upi) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid OTP or UPI ID' 
        });
      }

      // Save user to database
      const db = await getDb();
      
      // Double-check that user doesn't exist (race condition protection)
      const existingUser = await db.collection('users').findOne({ email: email });
      if (existingUser) {
        delete otpStore[email];
        return NextResponse.json({ 
          success: false, 
          message: 'An account with this email already exists.' 
        });
      }

      const newUser = {
        email: email,
        upi: upi,
        name: storedData.name || '',
        friends: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('users').insertOne(newUser);
      
      if (result.insertedId) {
        // Clean up OTP
        delete otpStore[email];
        
        return NextResponse.json({ 
          success: true, 
          message: 'Account created successfully!' 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to create account' 
        });
      }

    } catch (error) {
      console.error('Signup verify_otp error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error occurred',
        error: error.message 
      });
    }
  }

  return NextResponse.json({ 
    success: false, 
    message: 'Invalid action' 
  });
}
