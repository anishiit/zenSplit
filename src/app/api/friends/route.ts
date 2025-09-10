import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const search = searchParams.get('search');
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email parameter is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // If search parameter is provided, search for users by email
    if (search) {
      const users = await db.collection('users').find({
        email: { 
          $regex: search, 
          $options: 'i',
          $ne: email // Exclude the current user
        }
      }).limit(10).toArray();
      
      const searchResults = users.map(user => ({
        email: user.email,
        name: user.name || user.email.split('@')[0],
        isRegistered: true
      }));
      
      return NextResponse.json({ 
        success: true, 
        data: searchResults 
      });
    }
    
    // Get user's friends list
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
    const { userEmail, friendEmail, friendName } = await request.json();
    
    if (!userEmail || (!friendEmail && !friendName)) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email and either friend email or friend name are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    let friendToAdd;
    
    if (friendEmail) {
      // Check if friend exists in database
      const existingUser = await db.collection('users').findOne({ email: friendEmail });
      
      friendToAdd = {
        email: friendEmail,
        name: existingUser ? (existingUser.name || friendEmail.split('@')[0]) : friendEmail.split('@')[0],
        isRegistered: !!existingUser
      };
    } else {
      // Add friend by name only (not registered)
      friendToAdd = {
        name: friendName,
        isRegistered: false
      };
    }
    
    // Add friend to user's friends list
    const result = await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $addToSet: { friends: friendToAdd },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Friend added successfully',
      friend: friendToAdd
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
    const { userEmail, friendEmail, friendName } = await request.json();
    
    if (!userEmail || (!friendEmail && !friendName)) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email and either friend email or friend name are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Remove friend from user's friends list
    let removeQuery;
    if (friendEmail) {
      removeQuery = { 'friends.email': friendEmail };
    } else {
      removeQuery = { 'friends.name': friendName, 'friends.isRegistered': false };
    }
    
    const result = await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $pull: { friends: removeQuery.friends ? removeQuery.friends : removeQuery },
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
