import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

function generateGroupId() {
  return new ObjectId().toString();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Find user first
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Get all groups where user is a member
    const groups = await db.collection('groups').find({
      'members.userId': user.userId
    }).toArray();
    
    // Calculate real-time statistics for each group
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      // Get expenses for this group
      const expenses = await db.collection('expenses').find({
        groupId: group.groupId,
        isActive: true
      }).toArray();
      
      // Calculate actual statistics
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      // Update the group object with real-time stats
      return {
        ...group,
        stats: {
          totalExpenses: totalExpenses,
          totalAmount: totalAmount,
          memberCount: group.members ? group.members.length : 0
        }
      };
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: groupsWithStats 
    });
  } catch (error) {
    console.error('Groups GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userEmail, groupName, description, members = [] } = await request.json();
    
    if (!userEmail || !groupName) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email and group name are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Find user who is creating the group
    const creator = await db.collection('users').findOne({ email: userEmail });
    if (!creator) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Process members list - validate and get user info
    const processedMembers = [
      {
        userId: creator.userId,
        email: creator.email,
        name: creator.name || creator.email.split('@')[0],
        role: 'admin',
        joinedAt: new Date()
      }
    ];
    
    // Add other members if provided
    for (const memberEmail of members) {
      if (memberEmail !== userEmail) {
        const member = await db.collection('users').findOne({ email: memberEmail });
        if (member) {
          processedMembers.push({
            userId: member.userId,
            email: member.email,
            name: member.name || member.email.split('@')[0],
            role: 'member',
            joinedAt: new Date()
          });
        }
      }
    }
    
    const newGroup = {
      groupId: generateGroupId(),
      name: groupName,
      description: description || '',
      members: processedMembers,
      createdBy: creator.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      settings: {
        defaultSplitType: 'equal',
        currency: '₹',
        allowPartialPayments: true
      },
      stats: {
        totalExpenses: 0,
        totalAmount: 0,
        memberCount: processedMembers.length
      }
    };
    
    const result = await db.collection('groups').insertOne(newGroup);
    
    if (result.insertedId) {
      // Update all members' groups array
      const memberUserIds = processedMembers.map(m => m.userId);
      await db.collection('users').updateMany(
        { userId: { $in: memberUserIds } },
        { 
          $addToSet: { groups: newGroup.groupId },
          $set: { updatedAt: new Date() }
        }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Group created successfully',
        group: newGroup
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create group' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Groups POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { groupId, userEmail, action, data } = await request.json();
    
    if (!groupId || !userEmail || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Group ID, user email, and action are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify user exists and has permission
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    const group = await db.collection('groups').findOne({ groupId: groupId });
    if (!group) {
      return NextResponse.json({ 
        success: false, 
        error: 'Group not found' 
      }, { status: 404 });
    }
    
    // Check if user is member of the group
    const isMember = group.members.some(m => m.userId === user.userId);
    if (!isMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'User is not a member of this group' 
      }, { status: 403 });
    }
    
    let updateResult;
    
    switch (action) {
      case 'add_member':
        const { newMemberEmail } = data;
        const newMember = await db.collection('users').findOne({ email: newMemberEmail });
        
        if (!newMember) {
          return NextResponse.json({ 
            success: false, 
            error: 'User to add not found' 
          }, { status: 404 });
        }
        
        // Check if already a member
        const isAlreadyMember = group.members.some(m => m.userId === newMember.userId);
        if (isAlreadyMember) {
          return NextResponse.json({ 
            success: false, 
            error: 'User is already a member of this group' 
          }, { status: 400 });
        }
        
        const memberToAdd = {
          userId: newMember.userId,
          email: newMember.email,
          name: newMember.name || newMember.email.split('@')[0],
          role: 'member',
          joinedAt: new Date()
        };
        
        updateResult = await db.collection('groups').updateOne(
          { groupId: groupId },
          { 
            $push: { members: memberToAdd },
            $inc: { 'stats.memberCount': 1 },
            $set: { updatedAt: new Date() }
          }
        );
        
        // Add group to user's groups array
        await db.collection('users').updateOne(
          { userId: newMember.userId },
          { 
            $addToSet: { groups: groupId },
            $set: { updatedAt: new Date() }
          }
        );
        
        break;
        
      case 'leave_group':
        updateResult = await db.collection('groups').updateOne(
          { groupId: groupId },
          { 
            $pull: { members: { userId: user.userId } },
            $inc: { 'stats.memberCount': -1 },
            $set: { updatedAt: new Date() }
          }
        );
        
        // Remove group from user's groups array
        await db.collection('users').updateOne(
          { userId: user.userId },
          { 
            $pull: { groups: groupId },
            $set: { updatedAt: new Date() }
          }
        );
        
        break;
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Group updated successfully'
    });
    
  } catch (error) {
    console.error('Groups PUT error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { groupId, userEmail } = await request.json();
    
    if (!groupId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Group ID and user email are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Find user first
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Find the group
    const group = await db.collection('groups').findOne({ groupId: groupId });
    if (!group) {
      return NextResponse.json({ 
        success: false, 
        error: 'Group not found' 
      }, { status: 404 });
    }
    
    // Check if user is a member of the group
    const isMember = group.members.some(member => member.userId === user.userId);
    if (!isMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'You are not a member of this group' 
      }, { status: 403 });
    }
    
    // Check if user is the only member or if they're the creator
    const isOnlyMember = group.members.length === 1;
    const isCreator = group.createdBy === user.userId;
    
    if (!isOnlyMember && !isCreator) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only the group creator can delete the group, or you can leave if you are not the creator' 
      }, { status: 403 });
    }
    
    // Delete all expenses associated with this group
    await db.collection('expenses').deleteMany({ groupId: groupId });
    
    // Delete the group
    const result = await db.collection('groups').deleteOne({ groupId: groupId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete group' 
      }, { status: 500 });
    }
    
    // Remove group reference from all members' user records
    await db.collection('users').updateMany(
      { 'groups': groupId },
      { 
        $pull: { groups: groupId },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Group deleted successfully' 
    });
    
  } catch (error) {
    console.error('Groups DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
