import { NextResponse, after } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { deleteImage } from '../../../../lib/cloudinary';
import { analyzeSeed } from '../../../../lib/openrouter';
import { getWikipediaImages } from '../../../../lib/imageSearch';
import Scan from '../../../../models/Scan';

// GET single scan
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const scan = await Scan.findById(id);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scan);
  } catch (error) {
    console.error('Get scan error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}

// DELETE scan
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const scan = await Scan.findById(id);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary
    await deleteImage(scan.cloudinaryId);

    // Delete from MongoDB
    await Scan.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete scan error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scan' },
      { status: 500 }
    );
  }
}

// PATCH - rescan (re-run analysis)
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const scan = await Scan.findById(id);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Try reading body for actions (e.g., cancel)
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty for standard rescan triggers
    }

    if (body.action === 'cancel') {
      scan.status = 'failed';
      scan.error = 'Analysis cancelled by user';
      await scan.save();
      console.log(`[PATCH /api/scan/${id}] Analysis cancelled by user.`);
      return NextResponse.json({ id, status: 'failed', error: 'Analysis cancelled by user' });
    }

    // Reset status for rescan
    scan.status = 'analyzing';
    scan.error = null;
    await scan.save();

    // Safe background execution in Next.js 15
    after(async () => {
      try {
        console.log(`[PATCH /api/scan/${id}] Initiating stable background AI rescan...`);
        await rescanAndUpdate(id, scan.imageUrl);
      } catch (err) {
        console.error('[PATCH /api/scan] Rescan background task failed:', err);
      }
    });

    return NextResponse.json({ id, status: 'analyzing' });
  } catch (error) {
    console.error('Rescan error:', error);
    return NextResponse.json(
      { error: 'Failed to rescan' },
      { status: 500 }
    );
  }
}

async function rescanAndUpdate(scanId, imageUrl) {
  try {
    await connectDB();
    const result = await analyzeSeed(imageUrl);

    const wikiImages = await getWikipediaImages(result.scientificName, result.commonName);
    const flowerImageUrl = wikiImages.length > 0 ? wikiImages[0] : '';
    const searchQuery = result.flowerSearchQuery || result.commonName || 'flower';

    await Scan.findByIdAndUpdate(scanId, {
      status: 'complete',
      result: {
        identified: result.identified ?? false,
        commonName: result.commonName || 'Unknown',
        scientificName: result.scientificName || '',
        family: result.family || '',
        description: result.description || '',
        flowerImageUrl: flowerImageUrl,
        flowerImageUrls: wikiImages,
        flowerSearchQuery: searchQuery,
        planting: {
          bestSeason: result.planting?.bestSeason || '',
          avoidSeason: result.planting?.avoidSeason || '',
          soilType: result.planting?.soilType || '',
          sunlight: result.planting?.sunlight || '',
          waterNeeds: result.planting?.waterNeeds || '',
          spacing: result.planting?.spacing || '',
          depth: result.planting?.depth || '',
          germination: result.planting?.germination || '',
          daysToFlower: result.planting?.daysToFlower || '',
          idealClimate: result.planting?.idealClimate || '',
          bloomingSeason: result.planting?.bloomingSeason || '',
          sunlightHours: result.planting?.sunlightHours || '',
          monthlyPlantingSpectrum: result.planting?.monthlyPlantingSpectrum || [],
        },
        care: {
          fertilizer: result.care?.fertilizer || '',
          pests: result.care?.pests || '',
          diseases: result.care?.diseases || '',
          tips: result.care?.tips || [],
          companionPlants: result.care?.companionPlants || [],
          toxicity: result.care?.toxicity || '',
        },
        lifecycle: result.lifecycle || '',
        thingsToWatchOutFor: result.thingsToWatchOutFor || '',
        difficulty: result.difficulty || 'Unknown',
        zones: result.zones || 'Unknown',
        confidence: result.confidence || 0,
      },
    });
  } catch (error) {
    console.error('Rescan update error:', error);
    await connectDB();
    await Scan.findByIdAndUpdate(scanId, {
      status: 'failed',
      error: error.message || 'Re-analysis failed',
    });
  }
}
