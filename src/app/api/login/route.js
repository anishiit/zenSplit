
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
    subject: 'Your OTP for Login',
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
  const { email, otp, action } = await req.json();

  if (action === 'send_otp') {
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    try {
      // Check if user exists in database
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: email });
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          message: 'No account found with this email. Please sign up first.' 
        });
      }

      const generatedOtp = generateOtp();
      otpStore[email] = { otp: generatedOtp, timestamp: Date.now() };
      
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
      console.error('Login send_otp error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error occurred',
        error: error.message 
      });
    }
  }

  if (action === 'verify_otp') {
    if (!email || !otp) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email and OTP are required' 
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

      if (storedData.otp === otp) {
        // Clean up OTP
        delete otpStore[email];
        
        // Verify user still exists in database
        const db = await getDb();
        const user = await db.collection('users').findOne({ email: email });
        
        if (!user) {
          return NextResponse.json({ 
            success: false, 
            message: 'User account not found.' 
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Login successful',
          user: {
            email: user.email,
            name: user.name,
            upi: user.upi
          }
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid OTP' 
        });
      }
    } catch (error) {
      console.error('Login verify_otp error:', error);
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
