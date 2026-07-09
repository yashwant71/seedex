import { NextResponse, after } from 'next/server';
import connectDB from '../../../lib/mongodb';
import { uploadImage } from '../../../lib/cloudinary';
import { analyzeSeed } from '../../../lib/openrouter';
import { getWikipediaImages } from '../../../lib/imageSearch';
import Scan from '../../../models/Scan';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const { url, publicId } = await uploadImage(image);

    // Create scan record
    const scan = await Scan.create({
      imageUrl: url,
      cloudinaryId: publicId,
      status: 'analyzing',
    });

    // Safe background execution in Next.js 15
    after(async () => {
      try {
        console.log(`[POST /api/scan] Initiating stable background AI analysis for: ${scan._id}`);
        await analyzeAndUpdate(scan._id.toString(), url);
      } catch (err) {
        console.error('[POST /api/scan] Background analysis failed:', err);
      }
    });

    return NextResponse.json({
      id: scan._id,
      status: 'analyzing',
      imageUrl: url,
    }, { status: 201 });

  } catch (error) {
    console.error('Scan creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}

async function analyzeAndUpdate(scanId, imageUrl) {
  try {
    await connectDB();

    // Run AI analysis
    const result = await analyzeSeed(imageUrl);

    // Fetch real flower images from Wikipedia
    const wikiImages = await getWikipediaImages(result.scientificName, result.commonName);
    const flowerImageUrl = wikiImages.length > 0 ? wikiImages[0] : '';

    // Build a Google Images search URL for fallback/detail button
    const searchQuery = result.flowerSearchQuery || result.commonName || 'flower';

    // Update the scan record
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
    console.error('Analysis update error:', error);
    await connectDB();
    await Scan.findByIdAndUpdate(scanId, {
      status: 'failed',
      error: error.message || 'Analysis failed',
    });
  }
}
