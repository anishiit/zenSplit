import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const friends = await db.collection('friends').find({}).toArray();
    const friendNames = friends.map(friend => friend.name);
    return NextResponse.json({ data: friendNames });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { friendName } = await request.json();
    const db = await getDb();
    // Insert friend into the 'friends' collection
    await db.collection('friends').insertOne({ name: friendName });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { friendName } = await request.json();
    const db = await getDb();
    // Remove friend from friends collection
    await db.collection('friends').deleteOne({ name: friendName });
    // Delete all expenses where friend is payer or participant
    await db.collection('expenses').deleteMany({
      $or: [
        { payer: friendName },
        { participants: friendName }
      ]
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
