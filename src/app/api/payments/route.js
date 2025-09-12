import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const groupId = searchParams.get('groupId');
    
    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Build query based on parameters
    let query = {
      $or: [
        { payer: userEmail },
        { payee: userEmail }
      ]
    };
    
    if (groupId) {
      query.groupId = groupId;
    }
    
    const payments = await db.collection('payments')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true, 
      data: payments 
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const paymentData = await request.json();
    
    // Validate required fields
    const requiredFields = ['payer', 'payee', 'amount', 'userEmail'];
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        return NextResponse.json({ 
          success: false, 
          error: `${field} is required` 
        }, { status: 400 });
      }
    }
    
    // Validate amount
    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid amount is required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify that the user creating the payment exists
    const user = await db.collection('users').findOne({ email: paymentData.userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Verify that payer and payee exist
    const payer = await db.collection('users').findOne({ email: paymentData.payer });
    const payee = await db.collection('users').findOne({ email: paymentData.payee });
    
    if (!payer) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payer not found' 
      }, { status: 404 });
    }
    
    if (!payee) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payee not found' 
      }, { status: 404 });
    }
    
    // If groupId is provided, verify group exists and user is a member
    if (paymentData.groupId) {
      const group = await db.collection('groups').findOne({ groupId: paymentData.groupId });
      if (!group) {
        return NextResponse.json({ 
          success: false, 
          error: 'Group not found' 
        }, { status: 404 });
      }
      
      const isMember = group.members.some(m => m.userId === user.userId);
      if (!isMember) {
        return NextResponse.json({ 
          success: false, 
          error: 'User is not a member of this group' 
        }, { status: 403 });
      }
    }
    
    // Create payment record
    const newPayment = {
      payer: paymentData.payer,
      payee: paymentData.payee,
      amount: amount,
      note: paymentData.note || '',
      groupId: paymentData.groupId || null,
      status: 'pending', // pending, verified, cancelled
      createdBy: paymentData.userEmail,
      createdAt: new Date(),
      verifiedAt: null,
      verifiedBy: null
    };
    
    const result = await db.collection('payments').insertOne(newPayment);
    
    return NextResponse.json({ 
      success: true, 
      data: { ...newPayment, _id: result.insertedId } 
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { paymentId, action, userEmail } = await request.json();
    
    if (!paymentId || !action || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment ID, action, and user email are required' 
      }, { status: 400 });
    }
    
    if (!['verify', 'cancel'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Must be verify or cancel' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify user exists
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Find the payment
    const payment = await db.collection('payments').findOne({ 
      _id: new ObjectId(paymentId)
    });
    
    if (!payment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment not found' 
      }, { status: 404 });
    }
    
    // Only the payee can verify the payment
    if (action === 'verify' && payment.payee !== userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only the payee can verify the payment' 
      }, { status: 403 });
    }
    
    // Only the payer or payee can cancel the payment
    if (action === 'cancel' && payment.payer !== userEmail && payment.payee !== userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only the payer or payee can cancel the payment' 
      }, { status: 403 });
    }
    
    // Update payment status
    const updateData = {
      status: action === 'verify' ? 'verified' : 'cancelled'
    };
    
    if (action === 'verify') {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = userEmail;
    }
    
    const result = await db.collection('payments').updateOne(
      { _id: new ObjectId(paymentId) },
      { $set: updateData }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update payment' 
      }, { status: 500 });
    }
    
    // Fetch updated payment
    const updatedPayment = await db.collection('payments').findOne({ 
      _id: new ObjectId(paymentId)
    });
    
    return NextResponse.json({ 
      success: true, 
      data: updatedPayment 
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { paymentId, userEmail } = await request.json();
    
    if (!paymentId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment ID and user email are required' 
      }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify user exists
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Find the payment
    const payment = await db.collection('payments').findOne({ 
      _id: new ObjectId(paymentId)
    });
    
    if (!payment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment not found' 
      }, { status: 404 });
    }
    
    // Only the creator or admin can delete the payment
    if (payment.createdBy !== userEmail && payment.payer !== userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'You can only delete payments you created or payments where you are the payer' 
      }, { status: 403 });
    }
    
    // Don't allow deletion of verified payments
    if (payment.status === 'verified') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete verified payments' 
      }, { status: 400 });
    }
    
    const result = await db.collection('payments').deleteOne({ 
      _id: new ObjectId(paymentId)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete payment' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}