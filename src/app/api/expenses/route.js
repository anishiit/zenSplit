import { getDb } from '../../../lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const expenses = await db.collection('expenses').find().toArray();
    return Response.json({ success: true, data: expenses });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const expense = await request.json();
    const result = await db.collection('expenses').insertOne(expense);
    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
}

import { ObjectId } from 'mongodb';

// ... existing imports ...

export async function DELETE(request) {
  try {
    const db = await getDb();
    const { id } = await request.json();
    const result = await db.collection('expenses').deleteOne({ 
      _id: new ObjectId(id) 
    });
    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
}