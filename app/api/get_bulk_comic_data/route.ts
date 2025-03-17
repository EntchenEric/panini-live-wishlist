import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}

function createFallbackData(url: string) {
  if (!url || typeof url !== 'string') {
    return {
      price: "Price information not available",
      author: "Author information not available",
      url: "Unknown",
      title: "Comic information unavailable",
      needsUpdate: true,
      drawer: "Artist information not available",
      release: "Release date not available",
      type: "Comic",
      pageAmount: "Unknown",
      storys: "",
      binding: "",
      ISBN: "",
      deliverableTo: "Check website for availability",
      deliveryFrom: "",
      articleNumber: "",
      format: "",
      color: "",
      fallback: true,
      name: "Comic information unavailable"
    };
  }

  return {
    price: "Price information not available",
    author: "Author information not available",
    url: url,
    title: "Comic information unavailable",
    needsUpdate: true,
    drawer: "Artist information not available",
    release: "Release date not available",
    type: "Comic",
    pageAmount: "Unknown",
    storys: "",
    binding: "",
    ISBN: "",
    deliverableTo: "Check website for availability",
    deliveryFrom: "",
    articleNumber: "",
    format: "",
    color: "",
    fallback: true,
    name: "Comic information unavailable"
  };
}

function shouldUpdateCache(cachedData: any, cacheAge: number): boolean {
  if (cacheAge > 24 * 60 * 60 * 1000) return true;
  
  if (!cachedData.price || cachedData.price === "Price unavailable") return true;
  if (!cachedData.author || cachedData.author === "Unknown author") return true;
  
  if (cacheAge > 12 * 60 * 60 * 1000) return true;
  
  return false;
}

async function getCachedComicData(cacheKey: string): Promise<{ data: any, timestamp: number } | null> {
  try {
    const cachePath = `cache/${cacheKey}.json`;
    const fs = require('fs');
    
    if (!fs.existsSync('cache')) {
      fs.mkdirSync('cache', { recursive: true });
    }
    
    if (fs.existsSync(cachePath)) {
      const cacheContent = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(cacheContent);
    }
    
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

async function fetchComicDataFromBackend(url: string): Promise<any> {
  const maxRetries = 2;
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const encodedUrl = encodeURIComponent(url);
      
      const response = await fetch(`${backendUrl}/get_comic_information_api?url=${encodedUrl}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend responded with status ${response.status}: ${errorText}`);
        
        if (response.status === 404 && retries === 0) {
          const postResponse = await fetch(`${backendUrl}/get_comic_information`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(30000)
          });
          
          if (postResponse.ok) {
            const data = await postResponse.json();
            return mapBackendDataToComicData(data);
          } else {
            console.error(`Alternative endpoint also failed with status ${postResponse.status}`);
          }
        }
        
        throw new Error(`Backend responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Backend error: ${data.error}`);
      }
      
      const resultData = data.result || data;
      
      if (
        resultData && 
        typeof resultData === 'object' && 
        (
          (resultData.price && resultData.price !== "Price unavailable") ||
          resultData.title ||
          resultData.author || 
          resultData.Autor
        )
      ) {
        return mapBackendDataToComicData(data);
      } else {
        console.warn(`Received empty or invalid data from backend for URL: ${url}`);
        throw new Error("Backend returned incomplete data");
      }
    } catch (error) {
      console.error(`Error fetching from backend for ${url} (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      retries++;
      
      if (retries <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`All retries failed for ${url}`);
        return null;
      }
    }
  }
  
  return null;
}

function mapBackendDataToComicData(data: any): any {
    console.log("data: ", data)
  const resultData = data.result || data;
  
  // Look for name/title in both data and resultData with additional fields from sample data
  const comicName = data.name || 
                   data.title || 
                   resultData.name || 
                   resultData.title || 
                   resultData.Titel || 
                   'Comic information unavailable';
  
  return {
    price: resultData.price || 'Price unavailable',
    author: resultData.author || resultData.Autor || 'Unknown author',
    drawer: resultData.drawer || resultData.Zeichner || 'Unknown artist',
    release: resultData.release || resultData.releaseDate || resultData.Erscheinungsdatum || resultData["Erscheint am"] || 'Release date unavailable',
    type: resultData.type || resultData.Produktart || resultData.Typ || 'Comic',
    pageAmount: resultData.pageAmount || resultData.Seitenzahl || resultData.Seitenanzahl || resultData["Seiten"] || 'Unknown',
    storys: resultData.storys || resultData.Storys || resultData.Stories || '',
    binding: resultData.binding || resultData.Bindung || resultData.Binding || '',
    ISBN: resultData.ISBN || resultData.isbn || '',
    deliverableTo: resultData.deliverableTo || resultData['Lieferbar in folgende Länder'] || resultData.Lieferbar || 'Check website for availability',
    deliveryFrom: resultData.deliveryFrom || resultData['Versand von'] || '',
    articleNumber: resultData.articleNumber || resultData['Artikel-Nr.'] || resultData.Artikelnummer || '',
    format: resultData.format || resultData.Format || '',
    color: resultData.color || resultData['Farbe/Schwarz-Weiß'] || resultData.Farbe || '',
    name: comicName,
    title: comicName  // Also set the title field for consistency
  };
}

async function updateCache(cacheKey: string, data: any): Promise<void> {
  try {
    const fs = require('fs');
    const cachePath = `cache/${cacheKey}.json`;
    
    if (!fs.existsSync('cache')) {
      fs.mkdirSync('cache', { recursive: true });
    }
    
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to cache:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { urls } = requestBody;
    
    if (!urls) {
      console.error("No urls field in request body:", requestBody);
      return new Response(JSON.stringify({ error: 'No urls field provided in request' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!Array.isArray(urls)) {
      console.error("urls is not an array:", typeof urls, urls);
      return new Response(JSON.stringify({ error: 'urls must be an array' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (urls.length === 0) {
      return new Response(JSON.stringify({ data: {} }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const validUrls = urls.filter(url => {
      try {
        let urlToCheck = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          urlToCheck = 'https://' + url;
        }
        new URL(urlToCheck);
        return true;
      } catch (e) {
        console.error(`Invalid URL: ${url}`, e);
        return false;
      }
    });

    if (validUrls.length === 0) {
      console.error("No valid URLs after filtering");
      return new Response(JSON.stringify({ error: 'No valid URLs provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const comicData: Record<string, any> = {};
    const comicsToUpdate: Array<{ url: string, cacheKey: string }> = [];
    
    const normalizedUrls: string[] = [];
    const urlMapping = new Map<string, string>();
    const comicNumbers: string[] = [];
    const urlToComicNumberMap = new Map<string, string | null>();
    
    for (const url of validUrls) {
      const normalizedUrl = normalizeUrl(url);
      normalizedUrls.push(normalizedUrl);
      urlMapping.set(url, normalizedUrl);
      
      const comicNumber = url;
      urlToComicNumberMap.set(normalizedUrl, comicNumber);
      
      if (comicNumber) {
        comicNumbers.push(comicNumber);
      }
    }

    if (normalizedUrls.length === 0) {
      console.error("No valid URLs after normalization");
      return new Response(JSON.stringify({ 
        message: 'No valid URLs after normalization',
        data: {} 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let cachedComics = await prisma.cashedComicData.findMany({
      where: {
        url: {
          in: normalizedUrls
        }
      }
    });

    if (cachedComics.length < normalizedUrls.length && comicNumbers.length > 0) {
      const foundUrls = new Set(cachedComics.map(comic => comic.url));
      const missingComicNumbers = Array.from(urlToComicNumberMap.entries())
        .filter(([url, number]) => !foundUrls.has(url) && number !== null)
        .map(([_, number]) => number);
      
      if (missingComicNumbers.length > 0) {
        const legacyCachedComics = await prisma.cashedComicData.findMany({
          where: {
            url: {
              in: missingComicNumbers as string[]
            }
          }
        });
        
        cachedComics = [...cachedComics, ...legacyCachedComics];
      }
    }

    const comicDataByUrl = new Map();

    cachedComics.forEach(comic => {
      comicDataByUrl.set(comic.url, comic);
    });

    for (const url of validUrls) {
      const normalizedUrl = urlMapping.get(url) || normalizeUrl(url);
      
      if (comicDataByUrl.has(normalizedUrl)) {
        const cachedComic = comicDataByUrl.get(normalizedUrl);
        const cacheAge = cachedComic.lastUpdated ? (Date.now() - new Date(cachedComic.lastUpdated).getTime()) : Infinity;
        const needsUpdate = shouldUpdateCache(cachedComic, cacheAge);
        
        comicData[url] = {
          ...createResultFromCachedData(cachedComic, url),
          fromCache: true,
          needsUpdate: needsUpdate
        };
        
        if (needsUpdate) {
          comicsToUpdate.push({ url, cacheKey: normalizedUrl });
        }
      }
      else {
        const comicNumber = urlToComicNumberMap.get(normalizedUrl);
        
        if (comicNumber && comicDataByUrl.has(comicNumber)) {
          const cachedComic = comicDataByUrl.get(comicNumber);
          
          const cacheAge = cachedComic.lastUpdated ? (Date.now() - new Date(cachedComic.lastUpdated).getTime()) : Infinity;
          const needsUpdate = shouldUpdateCache(cachedComic, cacheAge);
          
          comicData[url] = {
            ...createResultFromCachedData(cachedComic, url),
            fromCache: true,
            needsUpdate: needsUpdate
          };
          
          if (needsUpdate) {
            comicsToUpdate.push({ url, cacheKey: normalizedUrl });
          }
        }
        else {
          comicData[url] = createFallbackData(url);
          
          comicsToUpdate.push({ url, cacheKey: normalizedUrl });
        }
      }
    }

    if (comicsToUpdate.length > 0) {
      backgroundUpdateComics(comicsToUpdate);
    }

    return new Response(JSON.stringify({ data: comicData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in bulk comic data route:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function createResultFromCachedData(cachedComic: any, url: string): any {
  const comicName = cachedComic.name || cachedComic.title || 'Unknown Comic';
  
  return {
    price: cachedComic.price || 'Price unavailable',
    author: cachedComic.author || 'Unknown author',
    drawer: cachedComic.drawer || 'Unknown artist',
    release: cachedComic.release || 'Release date unavailable',
    type: cachedComic.type || 'Comic',
    pageAmount: cachedComic.pageAmount || 'Unknown',
    storys: cachedComic.storys || '',
    binding: cachedComic.binding || '',
    ISBN: cachedComic.ISBN || '',
    deliverableTo: cachedComic.deliverableTo || 'Check website for availability',
    deliveryFrom: cachedComic.deliveryFrom || '',
    articleNumber: cachedComic.articleNumber || '',
    format: cachedComic.format || '',
    color: cachedComic.color || '',
    url: url,
    title: comicName,
    name: comicName,
    cachedAt: cachedComic.lastUpdated || 'Unknown date',
    cacheSource: 'prisma'
  };
}

async function backgroundUpdateComics(comicsToUpdate: Array<{ url: string, cacheKey: string }>) {
  const batchSize = 5;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    for (let i = 0; i < comicsToUpdate.length; i += batchSize) {
      const batch = comicsToUpdate.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (comic) => {
        try {
          const freshData = await fetchComicDataFromBackend(comic.url);
          
          if (!freshData) {
            return;
          }
          
          if (
            !freshData.price || 
            freshData.price === "Price unavailable" || 
            !freshData.author || 
            freshData.author === "Unknown author"
          ) {
            return;
          }
          
          await updatePrismaCache(comic.cacheKey, freshData, comic.url);
          
        } catch (error) {
          console.error(`Failed to update ${comic.url} in background:`, error);
        }
      }));
      
      if (i + batchSize < comicsToUpdate.length) {
        await delay(2000);
      }
    }
    
  } catch (error) {
    console.error('Error in background update process:', error);
  }
}

async function updatePrismaCache(cacheKey: string, data: any, url: string) {
  if (!cacheKey) {
    console.error("Invalid cacheKey provided to updatePrismaCache");
    return;
  }

  try {
    
    const mappedData = mapBackendDataToComicData(data);
    
    const comicName = mappedData.name || data.name || data.title || "Comic information unavailable";
    
    const existingCache = await prisma.cashedComicData.findUnique({
      where: {
        url: cacheKey
      }
    });

    if (existingCache) {
      if (mappedData.price && mappedData.price !== "Price unavailable") {
        await prisma.cashedComicData.update({
          where: {
            url: cacheKey
          },
          data: {
            price: mappedData.price || '',
            author: mappedData.author || '',
            drawer: mappedData.drawer || '',
            release: mappedData.release || '',
            type: mappedData.type || '',
            pageAmount: mappedData.pageAmount || '',
            storys: mappedData.storys || '',
            binding: mappedData.binding || '',
            ISBN: mappedData.ISBN || '',
            deliverableTo: mappedData.deliverableTo || '',
            deliveryFrom: mappedData.deliveryFrom || '',
            articleNumber: mappedData.articleNumber || '',
            format: mappedData.format || '',
            color: mappedData.color || '',
            name: comicName,
            lastUpdated: new Date()
          }
        });
      } else {
      }
    } else {
      if (mappedData.price && mappedData.price !== "Price unavailable") {
        await prisma.cashedComicData.create({
          data: {
            url: cacheKey,
            price: mappedData.price || '',
            author: mappedData.author || '',
            drawer: mappedData.drawer || '',
            release: mappedData.release || '',
            type: mappedData.type || '',
            pageAmount: mappedData.pageAmount || '',
            storys: mappedData.storys || '',
            binding: mappedData.binding || '',
            ISBN: mappedData.ISBN || '',
            deliverableTo: mappedData.deliverableTo || '',
            deliveryFrom: mappedData.deliveryFrom || '',
            articleNumber: mappedData.articleNumber || '',
            format: mappedData.format || '',
            color: mappedData.color || '',
            name: comicName,
            lastUpdated: new Date()
          }
        });
      }
    }

    try {
      if (comicName && comicName !== "Comic information unavailable") {
        const existingMapping = await prisma.nameNumberMap.findUnique({
          where: {
            url: cacheKey
          }
        });

        if (existingMapping) {
          if (existingMapping.name !== comicName) {
            await prisma.nameNumberMap.update({
              where: {
                url: cacheKey
              },
              data: {
                name: comicName
              }
            });
          }
        } else {
          await prisma.nameNumberMap.create({
            data: {
              url: cacheKey,
              name: comicName
            }
          });
        }
      }
    } catch (err) {
      console.error("Error updating nameNumberMap:", err);
    }

    return true;
  } catch (error) {
    console.error("Error updating Prisma cache:", error);
    return false;
  }
}

function normalizeUrl(url: string): string {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    const urlObj = new URL(normalizedUrl);
    return urlObj.toString().toLowerCase();
  } catch (e) {
    console.warn(`Could not normalize URL: ${url}`, e);
    return normalizedUrl.toLowerCase();
  }
}