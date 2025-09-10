import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email parameter is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email });
    
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
    
    const friends = user.friends || [];
    return NextResponse.json({ 
      success: true, 
      data: friends 
    });
  } catch (error: any) {
    console.error('Friends GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userEmail, friendName } = await request.json();
    
    if (!userEmail || !friendName) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email and friend name are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Add friend to user's friends list
    const result = await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $addToSet: { friends: friendName },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Friend added successfully'
    });
  } catch (error: any) {
    console.error('Friends POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userEmail, friendName } = await request.json();
    
    if (!userEmail || !friendName) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email and friend name are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Remove friend from user's friends list
    const result = await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $pull: { friends: friendName },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error: any) {
    console.error('Friends DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
