import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function POST() {
  try {
    const db = await getDb();
    
    // Get all groups
    const groups = await db.collection('groups').find({}).toArray();
    
    for (const group of groups) {
      // Calculate actual statistics from expenses
      const expenses = await db.collection('expenses').find({ 
        groupId: group.groupId,
        isActive: true 
      }).toArray();
      
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      // Update group with correct statistics
      await db.collection('groups').updateOne(
        { groupId: group.groupId },
        {
          $set: {
            'stats.totalExpenses': totalExpenses,
            'stats.totalAmount': totalAmount,
            'stats.memberCount': group.members ? group.members.length : 0,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`Updated group ${group.name}: ${totalExpenses} expenses, ₹${totalAmount} total`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated statistics for ${groups.length} groups`,
      groupsUpdated: groups.length
    });
    
  } catch (error) {
    console.error('Error fixing group stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
