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
    const mainRes = await fetch(mainUrl);
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
    const extraRes = await fetch(extraUrl);
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

  // If still empty, search Wikimedia Commons for this term + " flower" or just the term
  if (imageUrls.length === 0) {
    const commonsUrls = await getCommonsImageUrls(queryTerm, 5);
    imageUrls.push(...commonsUrls);
  }

  console.log(`[WikiImage] Retrieved ${imageUrls.length} unique plant images.`);
  return imageUrls.slice(0, 8); // return up to 8 images
}

// Search Wikimedia Commons files (namespace 6) to fetch direct URLs matching a search query
export async function getCommonsImageUrls(query, limit = 3) {
  if (!query) return [];
  console.log(`[CommonsImage] Searching Commons for files matching: "${query}"`);
  
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    if (results.length === 0) return [];

    // Filter relevant image titles
    const imageTitles = results
      .map(r => r.title)
      .filter(title => {
        const lower = title.toLowerCase();
        return (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) &&
          !lower.includes('logo') && !lower.includes('stub') && !lower.includes('icon');
      })
      .slice(0, limit);

    if (imageTitles.length === 0) return [];

    // Resolve URLs for all matched files in a batch call
    const titlesParam = imageTitles.join('|');
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titlesParam)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    
    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) return [];

    const infoData = await infoRes.json();
    const pages = infoData.query?.pages || {};
    
    const urls = [];
    Object.values(pages).forEach(page => {
      const url = page.imageinfo?.[0]?.url;
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    });

    console.log(`[CommonsImage] Resolved ${urls.length} file URLs from Commons.`);
    return urls;
  } catch (error) {
    console.error('[CommonsImage] Error searching Commons:', error);
    return [];
  }
}

export async function getWikipediaSeedImages(scientificName, commonName) {
  let urls = [];
  
  // Try Commons search using scientificName + " seed"
  if (scientificName) {
    const query = `${scientificName} seed`;
    urls = await getCommonsImageUrls(query, 3);
  }
  
  // Fallback to commonName + " seed" if empty
  if (urls.length === 0 && commonName) {
    const query = `${commonName} seed`;
    urls = await getCommonsImageUrls(query, 3);
  }

  // Double fallback to scientificName + " seeds" or fruit
  if (urls.length === 0 && scientificName) {
    urls = await getCommonsImageUrls(`${scientificName} fruit`, 2);
  }
  
  return urls;
}
