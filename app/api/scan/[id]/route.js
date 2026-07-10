import { NextResponse, after } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { deleteImage } from '../../../../lib/cloudinary';
import { analyzeSeed } from '../../../../lib/openrouter';
import { getWikipediaImages, getWikipediaSeedImages } from '../../../../lib/imageSearch';
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

    if (body.action === 'fetchImages') {
      if (!scan.result || (!scan.result.scientificName && !scan.result.commonName)) {
        return NextResponse.json({ error: 'Scan has no identified plant details yet' }, { status: 400 });
      }
      
      const { mode, type } = body; // mode: 'more'/'again', type: 'flower'/'seed'
      console.log(`[PATCH /api/scan/${id}] Fetching Wikipedia images (type: ${type}, mode: ${mode}) for: ${scan.result.scientificName || scan.result.commonName}`);
      
      const flagged = scan.result.flaggedImageUrls || [];
      let count = 0;

      if (type === 'seed') {
        const seedImages = await getWikipediaSeedImages(scan.result.scientificName, scan.result.commonName);
        if (mode === 'more') {
          if (!scan.result.seedImageUrls) scan.result.seedImageUrls = [];
          seedImages.forEach(url => {
            if (!scan.result.seedImageUrls.includes(url) && !flagged.includes(url)) {
              scan.result.seedImageUrls.push(url);
              count++;
            }
          });
        } else {
          scan.result.seedImageUrls = seedImages;
          count = seedImages.length;
        }
      } else {
        const wikiImages = await getWikipediaImages(scan.result.scientificName, scan.result.commonName);
        if (mode === 'more') {
          if (!scan.result.flowerImageUrls) scan.result.flowerImageUrls = [];
          wikiImages.forEach(url => {
            if (!scan.result.flowerImageUrls.includes(url) && !flagged.includes(url)) {
              scan.result.flowerImageUrls.push(url);
              count++;
            }
          });
          if (scan.result.flowerImageUrls.length > 0 && !scan.result.flowerImageUrl) {
            scan.result.flowerImageUrl = scan.result.flowerImageUrls[0];
          }
        } else {
          scan.result.flowerImageUrls = wikiImages;
          count = wikiImages.length;
          if (wikiImages.length > 0) {
            scan.result.flowerImageUrl = wikiImages[0];
          } else {
            scan.result.flowerImageUrl = '';
          }
        }
      }
      
      await scan.save();
      return NextResponse.json({ success: true, scan, count });
    }

    if (body.action === 'removeImage') {
      const { imageUrl } = body;
      if (!imageUrl) {
        return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 });
      }

      // Filter out of flowerImageUrls
      if (scan.result.flowerImageUrls) {
        scan.result.flowerImageUrls = scan.result.flowerImageUrls.filter(u => u !== imageUrl);
      }
      // Filter out of seedImageUrls
      if (scan.result.seedImageUrls) {
        scan.result.seedImageUrls = scan.result.seedImageUrls.filter(u => u !== imageUrl);
      }
      // If it was the main flower image, set it to the next available or empty
      if (scan.result.flowerImageUrl === imageUrl) {
        scan.result.flowerImageUrl = scan.result.flowerImageUrls?.[0] || '';
      }

      await scan.save();
      console.log(`[PATCH /api/scan/${id}] Removed image URL: ${imageUrl}`);
      return NextResponse.json(scan);
    }

    if (body.action === 'flagImage') {
      const { imageUrl, type } = body;
      if (!imageUrl) {
        return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 });
      }

      console.log(`[PATCH /api/scan/${id}] Flagging wrong image URL: ${imageUrl} (${type})`);

      // 1. Remove from local lists
      if (scan.result.flowerImageUrls) {
        scan.result.flowerImageUrls = scan.result.flowerImageUrls.filter(u => u !== imageUrl);
      }
      if (scan.result.seedImageUrls) {
        scan.result.seedImageUrls = scan.result.seedImageUrls.filter(u => u !== imageUrl);
      }
      if (scan.result.flowerImageUrl === imageUrl) {
        scan.result.flowerImageUrl = scan.result.flowerImageUrls?.[0] || '';
      }

      // Add to flagged list
      if (!scan.result.flaggedImageUrls) {
        scan.result.flaggedImageUrls = [];
      }
      if (!scan.result.flaggedImageUrls.includes(imageUrl)) {
        scan.result.flaggedImageUrls.push(imageUrl);
      }

      // 2. Fetch alternative new images
      if (type === 'seed') {
        const seedImages = await getWikipediaSeedImages(scan.result.scientificName, scan.result.commonName);
        const newSeedImg = seedImages.find(u => 
          u !== imageUrl && 
          !scan.result.seedImageUrls?.includes(u) && 
          !scan.result.flaggedImageUrls.includes(u)
        );
        if (newSeedImg) {
          scan.result.seedImageUrls.push(newSeedImg);
        }
      } else {
        const wikiImages = await getWikipediaImages(scan.result.scientificName, scan.result.commonName);
        const newFlowerImg = wikiImages.find(u => 
          u !== imageUrl && 
          !scan.result.flowerImageUrls?.includes(u) && 
          !scan.result.flaggedImageUrls.includes(u)
        );
        if (newFlowerImg) {
          scan.result.flowerImageUrls.push(newFlowerImg);
          if (!scan.result.flowerImageUrl) {
            scan.result.flowerImageUrl = newFlowerImg;
          }
        }
      }



      await scan.save();
      return NextResponse.json(scan);
    }

    // Extract manual name if provided in body
    const manualName = body.manualName || null;

    // Reset status for rescan
    scan.status = 'analyzing';
    scan.error = null;
    await scan.save();

    // Safe background execution in Next.js 15
    after(async () => {
      try {
        console.log(`[PATCH /api/scan/${id}] Initiating stable background AI rescan${manualName ? ` for "${manualName}"` : ''}...`);
        await rescanAndUpdate(id, scan.imageUrl, manualName);
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

async function rescanAndUpdate(scanId, imageUrl, manualName = null) {
  try {
    await connectDB();
    const result = await analyzeSeed(imageUrl, manualName);

    const wikiImages = await getWikipediaImages(result.scientificName, result.commonName);
    const flowerImageUrl = wikiImages.length > 0 ? wikiImages[0] : '';
    const seedImages = await getWikipediaSeedImages(result.scientificName, result.commonName);
    const searchQuery = result.flowerSearchQuery || result.commonName || 'flower';

    // Prevent duplicate seed entries in the library during rescan
    if (result.identified && result.scientificName) {
      try {
        const oldScan = await Scan.findOne({
          _id: { $ne: scanId },
          status: 'complete',
          'result.scientificName': result.scientificName,
        });

        if (oldScan) {
          console.log(`[PATCH /api/scan/:id] Found duplicate scan for "${result.scientificName}" (ID: ${oldScan._id}). Cleaning up old record to avoid duplicates...`);
          await Scan.findByIdAndDelete(oldScan._id);
          if (oldScan.cloudinaryId) {
            await deleteImage(oldScan.cloudinaryId);
          }
        }
      } catch (dupError) {
        console.error('[PATCH /api/scan/:id] Error during duplicate cleanup:', dupError);
      }
    }

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
        seedImageUrls: seedImages,
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
