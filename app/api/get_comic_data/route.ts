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

function extractComicNumber(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const comicPart = pathParts.find(part => /^\d+/.test(part));
    if (comicPart) {
      return comicPart.split('-')[0];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('-')) {
      const parts = lastPart.split('-');
      for (const part of parts) {
        if (/^\d+$/.test(part)) {
          return part;
        }
      }
    }
    
    return null;
  } catch (e) {
    console.error("Error extracting comic number:", e);
    return null;
  }
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

function extractComicName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      return lastPart.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    return "Unknown Comic";
  } catch (e) {
    console.error("Error extracting comic name:", e);
    return "Unknown Comic";
  }
}

function createFallbackResponse(url: string) {
  const comicName = extractComicName(url);

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
    name: comicName
  };
}

async function getComicNameFromMap(comicUrl: string, fallbackName: string): Promise<string> {
  try {
    const mapping = await prisma.nameNumberMap.findUnique({
      where: {
        url: comicUrl,
      },
    });
    
    if (mapping && mapping.name) {
      return mapping.name;
    }
  } catch (error) {
    console.error("Error fetching name from nameNumberMap:", error);
  }
  
  return fallbackName;
}

async function saveComicNameToMap(comicUrl: string, comicName: string): Promise<void> {
  if (!comicUrl || comicName === "Unknown Comic") {
    return;
  }
  
  try {
    const existingMapping = await prisma.nameNumberMap.findUnique({
      where: {
        url: comicUrl,
      },
    });

    if (existingMapping) {
      if (existingMapping.name !== comicName) {
        await prisma.nameNumberMap.update({
          where: {
            url: comicUrl,
          },
          data: {
            name: comicName,
          },
        });
      }
    } else {
      await prisma.nameNumberMap.create({
        data: {
          url: comicUrl,
          name: comicName,
        },
      });
    }
  } catch (error) {
    console.error("Error saving to nameNumberMap:", error);
  }
}

function mapBackendDataToExpectedFormat(data: any) {
  return {
    price: data.price || 'Price unavailable',
    author: data.Autor || data.author || '',
    drawer: data.Zeichner || data.drawer || '',
    release: data['Erscheint am'] || data.Erscheinungsdatum || data.release || '',
    type: data.Produktart || data.Typ || data.type || '',
    pageAmount: data.Seitenzahl || data.Seitenanzahl || data.pageAmount || '',
    storys: data.Storys || data.storys || '',
    binding: data.Bindung || data.binding || '',
    ISBN: data.ISBN || data.isbn || '',
    deliverableTo: data['Lieferbar in folgende Länder'] || data.Lieferbar || '',
    deliveryFrom: data['Versand von'] || data.deliveryFrom || '',
    articleNumber: data['Artikel-Nr.'] || data.articleNumber || '',
    format: data.Format || data.format || '',
    color: data['Farbe/Schwarz-Weiß'] || data.color || '',
    name: data.name || data.title || ''
  };
}

export async function GET(req: NextRequest) {
    const comicNumber = req.nextUrl.searchParams.get('number');
    const comicUrl = req.nextUrl.searchParams.get('url');
    const forceRefresh = req.nextUrl.searchParams.get('force_refresh') === 'true';

    const backendUrl: string | undefined = process.env.BACKEND_URL;

    if (!comicNumber && !comicUrl) {
        return new NextResponse(
            JSON.stringify({ message: 'Comic number or URL not provided.' }),
            { status: 400 }
        );
    }

    const comicNumberStr = comicNumber ? (Array.isArray(comicNumber) ? comicNumber[0] : comicNumber) : null;
    const comicUrlStr = comicUrl ? (Array.isArray(comicUrl) ? comicUrl[0] : comicUrl) : null;

    const normalizedUrl = comicUrlStr ? normalizeUrl(comicUrlStr) : null;

    const extractedName = comicUrlStr ? extractComicName(comicUrlStr) : "Unknown Comic";
    
    let comicName = extractedName;
    if (normalizedUrl) {
        comicName = await getComicNameFromMap(normalizedUrl, extractedName);
    } else if (comicNumberStr) {
        comicName = await getComicNameFromMap(comicNumberStr, extractedName);
    }

    try {
        if (normalizedUrl && extractedName !== "Unknown Comic") {
            await saveComicNameToMap(normalizedUrl, extractedName);
        }
        if ((normalizedUrl || comicNumberStr) && !forceRefresh) {
            try {
                let cachedData = null;
                
                if (normalizedUrl) {
                    cachedData = await prisma.cashedComicData.findUnique({
                        where: {
                            url: normalizedUrl,
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

                const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
                const now = new Date();
                
                if (cachedData && 
                    cachedData.price && 
                    cachedData.price !== "Price unavailable" && 
                    cachedData.author && 
                    cachedData.author !== "Unknown author") {
                    
                    const cacheAge = cachedData.lastUpdated ? now.getTime() - new Date(cachedData.lastUpdated).getTime() : Infinity;
                    
                    if (cacheAge < CACHE_EXPIRATION_MS) {
                        return new NextResponse(
                            JSON.stringify({ 
                                message: 'Comic data retrieved from cache.', 
                                data: {
                                    ...cachedData,
                                    name: comicName
                                },
                                fromCache: true,
                                cacheAge: Math.round(cacheAge / (60 * 60 * 1000)) + ' hours old'
                            }),
                            { status: 200 }
                        );
                    }
                }
            } catch (cacheError) {
                console.error("Error fetching from cache:", cacheError);
            }
        }

        if (!comicUrlStr) {
            const fallbackData = createFallbackResponse(comicUrl || "");
            return new NextResponse(
                JSON.stringify({ 
                    message: 'Using fallback comic data.', 
                    data: fallbackData,
                    fromCache: false,
                    fallback: true
                }),
                { status: 200 }
            );
        }

        try {
            const response = await fetch(`${backendUrl}/get_comic_information`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: comicUrlStr,
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                const fallbackData = createFallbackResponse(comicUrlStr);
                fallbackData.name = comicName;
                return new NextResponse(
                    JSON.stringify({ 
                        message: 'Using fallback comic data due to backend error.', 
                        data: fallbackData,
                        fromCache: false,
                        fallback: true
                    }),
                    { status: 200 }
                );
            }

            const comicData = await response.json();
            
            if (comicData.error) {
                const fallbackData = createFallbackResponse(comicUrlStr);
                fallbackData.name = comicName;
                return new NextResponse(
                    JSON.stringify({ 
                        message: 'Using fallback comic data due to backend error.', 
                        data: fallbackData,
                        fromCache: false,
                        fallback: true
                    }),
                    { status: 200 }
                );
            }
            
            if (normalizedUrl && comicData.result) {
                const data = typeof comicData.result === 'string' ? JSON.parse(comicData.result) : comicData.result;
                
                try {
                    const mappedData = mapBackendDataToExpectedFormat(data);
                    
                    // Prioritize name from backend data
                    const nameFromBackend = mappedData.name || data.name || data.title;
                    const comicNameToSave = nameFromBackend || comicName;
                    
                    const existingCache = await prisma.cashedComicData.findUnique({
                        where: {
                            url: normalizedUrl,
                        },
                    });

                    if (existingCache) {
                        await prisma.cashedComicData.update({
                            where: {
                                url: normalizedUrl,
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
                                name: comicNameToSave,
                                lastUpdated: new Date(),
                            },
                        });
                    } else {
                        await prisma.cashedComicData.create({
                            data: {
                                url: normalizedUrl,
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
                                name: comicNameToSave,
                                lastUpdated: new Date(),
                            },
                        });
                    }
                } catch (cacheError) {
                    console.error("Error caching comic data:", cacheError);
                }
            }

            const rawData = comicData.result;
            const mappedData = mapBackendDataToExpectedFormat(rawData);
            
            // Prioritize name from backend data
            const backendName = mappedData.name || rawData.name || rawData.title;
            
            const formattedData = {
                ...mappedData,
                name: backendName || comicName
            };

            return new NextResponse(
                JSON.stringify({ 
                    message: 'Comic data fetched successfully.', 
                    data: formattedData,
                    fromCache: false 
                }),
                { status: 200 }
            );
        } catch (fetchError: any) {
            console.error("Error fetching from backend:", fetchError);
            
            const fallbackData = createFallbackResponse(comicUrlStr);
            fallbackData.name = comicName;
            return new NextResponse(
                JSON.stringify({ 
                    message: 'Using fallback comic data due to fetch error.', 
                    data: fallbackData,
                    fromCache: false,
                    fallback: true
                }),
                { status: 200 }
            );
        }
    } catch (err) {
        console.error('Error fetching comic data:', err);
        
        const fallbackData = createFallbackResponse(comicUrlStr || "");
        if (normalizedUrl || comicNumberStr) {
            fallbackData.name = comicName;
        }
        return new NextResponse(
            JSON.stringify({ 
                message: 'Using fallback comic data due to error.', 
                data: fallbackData,
                fromCache: false,
                fallback: true
            }),
            { status: 200 }
        );
    }
} 