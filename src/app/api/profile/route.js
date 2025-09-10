import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

// GET - Fetch user profile
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email parameter is required' 
      }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Find user by email
    const user = await users.findOne({ email: email });

    if (!user) {
      // If user doesn't exist, create a basic profile
      const newUser = {
        email: email,
        name: '',
        upi: '',
        createdAt: new Date()
      };

      await users.insertOne(newUser);
      
      return NextResponse.json({
        success: true,
        profile: {
          email: email,
          name: '',
          upi: ''
        }
      });
    }

    // Return existing user profile
    return NextResponse.json({
      success: true,
      profile: {
        email: user.email,
        name: user.name || '',
        upi: user.upi || ''
      }
    });

  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch profile',
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Update user profile
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, upi } = body;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Update user profile
    const result = await users.updateOne(
      { email: email },
      { 
        $set: { 
          name: name || '',
          upi: upi || '',
          updatedAt: new Date()
        }
      },
      { upsert: true } // Create if doesn't exist
    );

    if (result.matchedCount > 0 || result.upsertedCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        profile: {
          email: email,
          name: name || '',
          upi: upi || ''
        }
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update profile' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update profile',
      error: error.message 
    }, { status: 500 });
  }
}
