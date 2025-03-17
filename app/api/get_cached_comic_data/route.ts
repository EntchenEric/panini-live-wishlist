import { NextRequest, NextResponse } from 'next/server';
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

function normalizeUrl(url: string): string {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    const urlObj = new URL(normalizedUrl);
    return urlObj.toString();
  } catch (e) {
    console.warn(`Could not normalize URL: ${url}`, e);
    return normalizedUrl;
  }
}

function createFallbackResponse(url: string) {
  return {
    price: "Price unavailable",
    author: "Unknown author",
    drawer: "Unknown artist",
    release: "Release date unavailable",
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
    name: "Unknown Comic",
    cached: false
  };
}

export async function GET(req: NextRequest) {
  const comicNumber = req.nextUrl.searchParams.get('number');
  const comicUrl = req.nextUrl.searchParams.get('url');
  
  if (!comicNumber && !comicUrl) {
    return new NextResponse(
      JSON.stringify({ message: 'Comic number or URL not provided.' }),
      { status: 400 }
    );
  }
  
  const comicNumberStr = comicNumber ? (Array.isArray(comicNumber) ? comicNumber[0] : comicNumber) : null;
  const comicUrlStr = comicUrl ? (Array.isArray(comicUrl) ? comicUrl[0] : comicUrl) : null;
  
  const cacheKey = comicUrlStr ? normalizeUrl(comicUrlStr) : null;
  
  if (!cacheKey && !comicNumberStr) {
    return new NextResponse(
      JSON.stringify({ 
        message: 'No comic URL or number available, cannot fetch cached data.', 
        data: createFallbackResponse(comicUrlStr || ""),
        cached: false
      }),
      { status: 404 }
    );
  }
  
  try {
    let cachedData = null;
    
    if (cacheKey) {
      cachedData = await prisma.cashedComicData.findUnique({
        where: {
          url: cacheKey,
        },
      });
    }
    
    if (!cachedData && comicNumberStr) {
      cachedData = await prisma.cashedComicData.findUnique({
        where: {
          url: comicNumberStr,
        },
      });
    }
    
    if (!cachedData) {
      return new NextResponse(
        JSON.stringify({ 
          message: 'No cached data found.', 
          data: createFallbackResponse(comicUrlStr || ""),
          cached: false
        }),
        { status: 404 }
      );
    }
    
    let comicName = "Unknown Comic";
    try {
      if (cacheKey) {
        const mapping = await prisma.nameNumberMap.findUnique({
          where: {
            url: cacheKey,
          },
        });
        
        if (mapping && mapping.name) {
          comicName = mapping.name;
        } else if (cachedData && cachedData.name) {
          comicName = cachedData.name;
        }
      } else if (cachedData && cachedData.name) {
        comicName = cachedData.name;
      }
    } catch (nameError) {
      console.error("Error fetching from nameNumberMap:", nameError);
    }
    
    const now = new Date();
    const cacheAge = cachedData.lastUpdated ? now.getTime() - new Date(cachedData.lastUpdated).getTime() : null;
    const cacheAgeHours = cacheAge ? Math.round(cacheAge / (60 * 60 * 1000)) : 'unknown';
    
    return new NextResponse(
      JSON.stringify({ 
        message: 'Cached comic data retrieved successfully.', 
        data: {
          ...cachedData,
          name: comicName || (cachedData as any).name || "Unknown Comic"
        },
        cached: true,
        cacheAge: cacheAgeHours + ' hours old'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching cached comic data:", error);
    return new NextResponse(
      JSON.stringify({ 
        message: 'Error fetching cached data.', 
        error: String(error),
        data: createFallbackResponse(comicUrlStr || ""),
        cached: false
      }),
      { status: 500 }
    );
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
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid URLs provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const normalizedUrls: string[] = [];
    const comicNumbers: string[] = [];
    const urlToComicNumberMap = new Map<string, string | null>();
    
    for (const url of urls) {
      if (!url) continue;
      
      const normalizedUrl = normalizeUrl(url);
      normalizedUrls.push(normalizedUrl);
      
      const comicNumber = url;
      urlToComicNumberMap.set(normalizedUrl, comicNumber);
      
      if (comicNumber) {
        comicNumbers.push(comicNumber);
      }
    }
    
    if (normalizedUrls.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No valid URLs could be processed.',
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
    const comicDataByNumber = new Map();
    
    cachedComics.forEach(comic => {
      comicDataByUrl.set(comic.url, comic);
      
      if (/^[A-Z0-9_]+$/.test(comic.url)) {
        comicDataByNumber.set(comic.url, comic);
      }
    });
    
    const result: Record<string, any> = {};
    
    for (const url of normalizedUrls) {
      if (comicDataByUrl.has(url)) {
        const cachedComic = comicDataByUrl.get(url);
        const now = new Date();
        const cacheAge = cachedComic.lastUpdated ? 
          Math.round((now.getTime() - new Date(cachedComic.lastUpdated).getTime()) / (60 * 60 * 1000)) : 
          'unknown';
        
        const comicName = cachedComic.name || 'Unknown Comic';
        
        result[url] = {
          ...cachedComic,
          cached: true,
          cacheAge: `${cacheAge} hours old`,
          name: comicName
        };
      }
      else if (urlToComicNumberMap.has(url) && urlToComicNumberMap.get(url) !== null && comicDataByNumber.has(urlToComicNumberMap.get(url)!)) {
        const comicNumber = urlToComicNumberMap.get(url)!;
        const cachedComic = comicDataByNumber.get(comicNumber);
        const now = new Date();
        const cacheAge = cachedComic.lastUpdated ? 
          Math.round((now.getTime() - new Date(cachedComic.lastUpdated).getTime()) / (60 * 60 * 1000)) : 
          'unknown';
        
        const comicName = cachedComic.name || 'Unknown Comic';
        
        result[url] = {
          ...cachedComic,
          cached: true,
          cacheAge: `${cacheAge} hours old`,
          name: comicName
        };
      }
      else {
        result[url] = {
          ...createFallbackResponse(url),
          url: url
        };
      }
    }
    
    return new Response(JSON.stringify({ 
      message: `Cached data retrieved for ${Object.keys(result).length} comics.`,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in bulk cached comic data route:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 