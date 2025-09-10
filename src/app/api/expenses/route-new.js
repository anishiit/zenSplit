import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' });
    }
    
    // Return empty array for now (until MongoDB is properly configured)
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(request) {
  try {
    const expense = await request.json();
    console.log('Expense received:', expense);
    
    // For now, just return success (until MongoDB is properly configured)
    return NextResponse.json({ success: true, data: { insertedId: 'temp_id' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    console.log('Deleting expense:', id);
    
    // For now, just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
