import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    const db = await getDb();
    
    // Find all users without userId
    const usersWithoutUserId = await db.collection('users').find({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: undefined }
      ]
    }).toArray();
    
    console.log(`Found ${usersWithoutUserId.length} users without userId`);
    
    // Update each user with a new userId
    for (const user of usersWithoutUserId) {
      const newUserId = new ObjectId().toString();
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            userId: newUserId,
            updatedAt: new Date()
          } 
        }
      );
      console.log(`Updated user ${user.email} with userId: ${newUserId}`);
    }
    
    // Also update group members who might have null userIds
    const groups = await db.collection('groups').find({}).toArray();
    
    for (const group of groups) {
      let membersUpdated = false;
      const updatedMembers = [];
      
      for (const member of group.members) {
        if (!member.userId) {
          // Find the user by email to get their userId
          const user = await db.collection('users').findOne({ email: member.email });
          if (user && user.userId) {
            updatedMembers.push({
              ...member,
              userId: user.userId
            });
            membersUpdated = true;
            console.log(`Updated group member ${member.email} with userId: ${user.userId}`);
          } else {
            updatedMembers.push(member);
          }
        } else {
          updatedMembers.push(member);
        }
      }
      
      if (membersUpdated) {
        await db.collection('groups').updateOne(
          { _id: group._id },
          { 
            $set: { 
              members: updatedMembers,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`Updated group ${group.name} members`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Migration completed. Updated ${usersWithoutUserId.length} users and their group memberships.`
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
