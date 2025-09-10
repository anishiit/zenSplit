import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Return some default friends for now
    const defaultFriends = ['Alice', 'Bob', 'Charlie'];
    return NextResponse.json({ data: defaultFriends });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { friendName } = await request.json();
    console.log('Adding friend:', friendName);
    
    // For now, just return success
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { friendName } = await request.json();
    console.log('Deleting friend:', friendName);
    
    // For now, just return success
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
