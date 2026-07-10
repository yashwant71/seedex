import { safeFetch } from './safeFetch.js';

export async function getWikipediaImage(scientificName, commonName) {
  const images = await getWikipediaImages(scientificName, commonName);
  return images.length > 0 ? images[0] : '';
}

export async function getWikipediaImages(scientificName, commonName) {
  const queryTerm = scientificName || commonName;
  if (!queryTerm) return [];

  console.log(`[WikiImage] Fetching multiple images for: "${queryTerm}"`);
  const imageUrls = [];

  try {
    // 1. Fetch main article image
    const mainUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(queryTerm)}&piprop=original&redirects=1&origin=*`;
    const mainRes = await safeFetch(mainUrl);
    if (mainRes.ok) {
      const mainData = await mainRes.json();
      const pages = mainData.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].original?.source) {
          imageUrls.push(pages[pageId].original.source);
        }
      }
    }

    // 2. Fetch other embedded images inside the article
    const extraUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=images&titles=${encodeURIComponent(queryTerm)}&prop=imageinfo&iiprop=url&gimlimit=25&redirects=1&origin=*`;
    const extraRes = await safeFetch(extraUrl);
    if (extraRes.ok) {
      const extraData = await extraRes.json();
      const pages = extraData.query?.pages;
      if (pages) {
        Object.values(pages).forEach((page) => {
          const info = page.imageinfo?.[0];
          if (info?.url) {
            const url = info.url;
            const lowerUrl = url.toLowerCase();
            const isBotanyImage = 
              (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png')) &&
              !lowerUrl.includes('logo') &&
              !lowerUrl.includes('icon') &&
              !lowerUrl.includes('stub') &&
              !lowerUrl.includes('sign') &&
              !lowerUrl.includes('map') &&
              !lowerUrl.includes('scale') &&
              !lowerUrl.includes('padlock') &&
              !lowerUrl.includes('edit-clear') &&
              !lowerUrl.includes('question_mark');
            
            if (isBotanyImage && !imageUrls.includes(url)) {
              imageUrls.push(url);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('[WikiImage] Error fetching article images:', error);
  }

  // If no images found, try common name fallback
  if (imageUrls.length === 0 && scientificName && commonName && queryTerm !== commonName) {
    return getWikipediaImages(null, commonName);
  }

  console.log(`[WikiImage] Retrieved ${imageUrls.length} unique plant images.`);
  return imageUrls.slice(0, 8); // return up to 8 images
}

export async function getWikipediaSeedImages(scientificName, commonName) {
  // Try scanning inside articles in order of specificity
  const articlesToScan = [];
  if (scientificName) articlesToScan.push(scientificName);
  if (commonName && commonName !== scientificName) articlesToScan.push(commonName);

  for (const queryTerm of articlesToScan) {
    console.log(`[WikiImage-Seed] Scanning inside article: "${queryTerm}"`);
    const imageUrls = [];
    try {
      const extraUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=images&titles=${encodeURIComponent(queryTerm)}&prop=imageinfo&iiprop=url&gimlimit=35&redirects=1&origin=*`;
      const extraRes = await safeFetch(extraUrl);
      if (extraRes.ok) {
        const extraData = await extraRes.json();
        const pages = extraData.query?.pages;
        if (pages) {
          Object.values(pages).forEach((page) => {
            const info = page.imageinfo?.[0];
            if (info?.url) {
              const url = info.url;
              const lowerUrl = url.toLowerCase();
              
              const isSeedImage = 
                (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png')) &&
                (lowerUrl.includes('seed') || 
                 lowerUrl.includes('semin') || 
                 lowerUrl.includes('grain') || 
                 lowerUrl.includes('pod') || 
                 lowerUrl.includes('fruit') || 
                 lowerUrl.includes('capsule') ||
                 lowerUrl.includes('cone'));
              
              if (isSeedImage && !imageUrls.includes(url)) {
                imageUrls.push(url);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error(`[WikiImage-Seed] Error scanning article "${queryTerm}":`, error);
    }

    if (imageUrls.length > 0) {
      console.log(`[WikiImage-Seed] Found ${imageUrls.length} seed images inside article: "${queryTerm}"`);
      return imageUrls.slice(0, 5);
    }
  }

  // Fallback to title searches in order of specificity
  const titleSearchTerms = [];
  if (scientificName) {
    titleSearchTerms.push(`${scientificName} seed`);
    titleSearchTerms.push(`${scientificName} seeds`);
    const spaceIdx = scientificName.indexOf(' ');
    if (spaceIdx > 0) {
      const genus = scientificName.substring(0, spaceIdx);
      titleSearchTerms.push(`${genus} seed`);
      titleSearchTerms.push(`${genus} seeds`);
    }
  }
  if (commonName) {
    titleSearchTerms.push(`${commonName} seed`);
    titleSearchTerms.push(`${commonName} seeds`);
  }

  const uniqueTerms = Array.from(new Set(titleSearchTerms));

  for (const term of uniqueTerms) {
    console.log(`[WikiImage-Seed] Trying title search fallback: "${term}"`);
    const images = await getWikipediaImages(term);
    if (images.length > 0) {
      console.log(`[WikiImage-Seed] Found ${images.length} seed images via title fallback: "${term}"`);
      return images;
    }
  }

  console.log(`[WikiImage-Seed] No seed images found for any fallbacks.`);
  return [];
}
