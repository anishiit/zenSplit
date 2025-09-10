import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const groupId = searchParams.get('groupId');
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    let query = { userEmail: email };
    
    // If groupId is provided, filter by group
    if (groupId) {
      query.groupId = groupId;
    }
    
    const expenses = await db.collection('expenses')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true, 
      data: expenses 
    });
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const expense = await request.json();
    console.log('Expense received:', expense);
    
    // Fix field mapping - frontend sends 'payer' but we need 'userEmail'
    if (expense.payer && !expense.userEmail) {
      expense.userEmail = expense.payer;
    }
    
    if (!expense.userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify user exists
    const user = await db.collection('users').findOne({ email: expense.userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    let expenseData;
    
    if (expense.groupId && expense.groupId !== null) {
      // Group expense
      const group = await db.collection('groups').findOne({ groupId: expense.groupId });
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
      
      expenseData = {
        ...expense,
        expenseId: new ObjectId().toString(),
        groupId: expense.groupId,
        groupName: group.name,
        createdBy: user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
      
      // Update group statistics
      await db.collection('groups').updateOne(
        { groupId: expense.groupId },
        { 
          $inc: { 'statistics.totalExpenses': 1, 'statistics.totalAmount': expense.amount },
          $set: { updatedAt: new Date() }
        }
      );
    } else {
      // Personal expense (no group)
      expenseData = {
        ...expense,
        expenseId: new ObjectId().toString(),
        groupId: null,
        groupName: null,
        createdBy: user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
    }
    
    const result = await db.collection('expenses').insertOne(expenseData);
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        insertedId: result.insertedId,
        ...expenseData 
      } 
    });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense ID is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    const result = await db.collection('expenses').deleteOne({ 
      _id: new ObjectId(id) 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Expense deleted successfully' 
    });
  } catch (error) {
    console.error('Expenses DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}