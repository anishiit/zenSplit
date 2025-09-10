import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    const expenses = await db.collection('expenses')
      .find({ userEmail: email })
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
    
    if (!expense.userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    const expenseData = {
      ...expense,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
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