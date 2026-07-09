import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Scan from '../../../models/Scan';

// GET all scans
export async function GET() {
  try {
    await connectDB();

    const scans = await Scan.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(scans);
  } catch (error) {
    console.error('Get scans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}
