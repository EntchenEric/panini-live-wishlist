import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for Prisma client to avoid too many connections
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

// Helper function to extract comic number from URL
function extractComicNumber(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Assuming the URL format is something like /comics/12345-name
    const comicPart = pathParts.find(part => /^\d+/.test(part));
    if (comicPart) {
      return comicPart.split('-')[0];
    }
    
    // Try to extract from the last part of the URL
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('-')) {
      const parts = lastPart.split('-');
      // Check if any part is a number
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

// Helper function to extract comic name from URL
function extractComicName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      // Format the name from URL: convert "batman-1-variant-b" to "Batman 1 Variant B"
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

// Create a fallback response with basic data
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

// Helper function to get comic name from nameNumberMap
async function getComicNameFromMap(comicNumber: string, fallbackName: string): Promise<string> {
  try {
    const mapping = await prisma.nameNumberMap.findUnique({
      where: {
        number: comicNumber,
      },
    });
    
    if (mapping && mapping.name) {
      console.log(`Found name "${mapping.name}" for comic number ${comicNumber} in nameNumberMap`);
      return mapping.name;
    }
  } catch (error) {
    console.error("Error fetching name from nameNumberMap:", error);
  }
  
  return fallbackName;
}

// Helper function to save comic name to nameNumberMap
async function saveComicNameToMap(comicNumber: string, comicName: string): Promise<void> {
  if (!comicNumber || comicName === "Unknown Comic") {
    return;
  }
  
  try {
    const existingMapping = await prisma.nameNumberMap.findUnique({
      where: {
        number: comicNumber,
      },
    });

    if (existingMapping) {
      // Update only if name is different
      if (existingMapping.name !== comicName) {
        console.log(`Updating name for comic number ${comicNumber} from "${existingMapping.name}" to "${comicName}"`);
        await prisma.nameNumberMap.update({
          where: {
            number: comicNumber,
          },
          data: {
            name: comicName,
          },
        });
      }
    } else {
      // Create new mapping
      console.log(`Creating new name-number mapping: ${comicNumber} -> "${comicName}"`);
      await prisma.nameNumberMap.create({
        data: {
          number: comicNumber,
          name: comicName,
        },
      });
    }
  } catch (error) {
    console.error("Error saving to nameNumberMap:", error);
  }
}

// Helper function to map backend data fields to our expected format
function mapBackendDataToExpectedFormat(data: any) {
  return {
    price: data.price || 'Price unavailable',
    author: data.Autor || '',
    drawer: data.Zeichner || '',
    release: data['Erscheint am'] || data.Erscheinungsdatum || '',
    type: data.Produktart || data.Typ || '',
    pageAmount: data.Seitenzahl || data.Seitenanzahl || '',
    storys: data.Storys || '',
    binding: data.Bindung || '',
    ISBN: data.ISBN || '',
    deliverableTo: data['Lieferbar in folgende Länder'] || data.Lieferbar || '',
    deliveryFrom: data['Versand von'] || data.deliveryFrom || '',
    articleNumber: data['Artikel-Nr.'] || '',
    format: data.Format || '',
    color: data['Farbe/Schwarz-Weiß'] || ''
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

    // Convert to string if it's an array
    let comicNumberStr = comicNumber ? (Array.isArray(comicNumber) ? comicNumber[0] : comicNumber) : null;
    const comicUrlStr = comicUrl ? (Array.isArray(comicUrl) ? comicUrl[0] : comicUrl) : null;

    // If no comic number provided but URL is available, try to extract number from URL
    if (!comicNumberStr && comicUrlStr) {
        comicNumberStr = extractComicNumber(comicUrlStr);
        console.log("Extracted comic number from URL:", comicNumberStr);
    }

    // Extract comic name from URL for mapping
    const extractedName = comicUrlStr ? extractComicName(comicUrlStr) : "Unknown Comic";
    
    // Get the comic name from the mapping if available
    let comicName = extractedName;
    if (comicNumberStr) {
        comicName = await getComicNameFromMap(comicNumberStr, extractedName);
    }

    try {
        // If we have a comic number, save the name-number mapping
        if (comicNumberStr && extractedName !== "Unknown Comic") {
            await saveComicNameToMap(comicNumberStr, extractedName);
        }

        // Check if we should use cached data (if not forcing refresh)
        if (comicNumberStr && !forceRefresh) {
            try {
                console.log("Looking for cached data with number:", comicNumberStr);
                const cachedData = await prisma.cashedComicData.findUnique({
                    where: {
                        number: comicNumberStr,
                    },
                });

                // Define a cache expiration period (e.g., 24 hours)
                const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
                const now = new Date();
                
                // Check if we have cached data and it's not too old
                // Since we don't have a timestamp field, we'll use other heuristics
                // like checking if the data is complete
                if (cachedData && 
                    cachedData.price && 
                    cachedData.price !== "Price unavailable" && 
                    cachedData.author && 
                    cachedData.author !== "Unknown author") {
                    
                    // Check if the cache is expired based on lastUpdated field
                    const cacheAge = cachedData.lastUpdated ? now.getTime() - new Date(cachedData.lastUpdated).getTime() : Infinity;
                    
                    if (cacheAge < CACHE_EXPIRATION_MS) {
                        console.log("Returning cached comic data for number:", comicNumberStr);
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
                    } else {
                        console.log("Cached data is expired for number:", comicNumberStr, "Age:", Math.round(cacheAge / (60 * 60 * 1000)), "hours");
                    }
                } else {
                    console.log("Cached data is incomplete or not found for number:", comicNumberStr);
                }
            } catch (cacheError) {
                console.error("Error fetching from cache:", cacheError);
                // Continue to fetch from backend if cache fails
            }
        } else if (forceRefresh) {
            console.log("Force refresh requested, skipping cache lookup");
        }

        // If no cached data or no comic number, fetch from backend
        if (!comicUrlStr) {
            // Return a fallback response if we can't fetch from backend
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

        // Fetch fresh data from backend
        try {
            console.log("Fetching data from backend for URL:", comicUrlStr);
            const response = await fetch(`${backendUrl}/get_comic_information`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: comicUrlStr,
                }),
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(10000), // 10 seconds timeout
            });

            if (!response.ok) {
                console.log("Backend returned non-OK status:", response.status);
                // Return fallback data if backend fails
                const fallbackData = createFallbackResponse(comicUrlStr);
                fallbackData.name = comicName; // Use the name from mapping if available
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
            console.log("Received data from backend:", comicData);
            
            // Check if the backend returned an error
            if (comicData.error) {
                console.log("Backend returned error:", comicData.error);
                // Return fallback data if backend returns an error
                const fallbackData = createFallbackResponse(comicUrlStr);
                fallbackData.name = comicName; // Use the name from mapping if available
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
            
            // If we have a comic number, cache the data
            if (comicNumberStr && comicData.result) {
                const data = typeof comicData.result === 'string' ? JSON.parse(comicData.result) : comicData.result;
                console.log("Processed data for caching:", data);
                
                try {
                    // Map the data to our expected format
                    const mappedData = mapBackendDataToExpectedFormat(data);
                    
                    // Check if we already have a cached entry
                    const existingCache = await prisma.cashedComicData.findUnique({
                        where: {
                            number: comicNumberStr,
                        },
                    });

                    if (existingCache) {
                        // Update existing cache
                        console.log("Updating existing cache for number:", comicNumberStr);
                        await prisma.cashedComicData.update({
                            where: {
                                number: comicNumberStr,
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
                                lastUpdated: new Date(),
                            },
                        });
                    } else {
                        // Create new cache entry
                        console.log("Creating new cache entry for number:", comicNumberStr);
                        await prisma.cashedComicData.create({
                            data: {
                                number: comicNumberStr,
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
                                lastUpdated: new Date(),
                            },
                        });
                    }
                    console.log("Successfully cached data for number:", comicNumberStr);
                } catch (cacheError) {
                    console.error("Error caching comic data:", cacheError);
                    // Continue even if caching fails
                }
            }

            // Format the data to match the expected structure
            const rawData = comicData.result;
            const mappedData = mapBackendDataToExpectedFormat(rawData);
            
            const formattedData = {
                ...mappedData,
                name: comicName // Use the name from mapping if available
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
            
            // Return fallback data if backend fails
            const fallbackData = createFallbackResponse(comicUrlStr);
            fallbackData.name = comicName; // Use the name from mapping if available
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
        
        // Return fallback data for any error
        const fallbackData = createFallbackResponse(comicUrlStr || "");
        if (comicNumberStr) {
            fallbackData.name = comicName; // Use the name from mapping if available
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