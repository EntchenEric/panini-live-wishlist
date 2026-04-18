import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { normalizeUrl, createFallbackComicData } from '@/lib/comic-utils'
import { requireAuth } from '@/lib/auth'
import { handleNotFound, handleDatabaseError } from '@/lib/error-handler'

export const GET = requireAuth(async (req: NextRequest, _session) => {
  const comicNumber = req.nextUrl.searchParams.get('number');
  const comicUrl = req.nextUrl.searchParams.get('url');

  if (!comicNumber && !comicUrl) {
    return NextResponse.json({ message: 'Comic number or URL not provided.' }, { status: 400 });
  }

  const comicNumberStr = comicNumber || null;
  const comicUrlStr = comicUrl || null;

  const cacheKey = comicUrlStr ? normalizeUrl(comicUrlStr) : null;

  if (!cacheKey && !comicNumberStr) {
    return handleNotFound();
  }

  try {
    let cachedData = null;

    if (cacheKey) {
      cachedData = await prisma.cachedComicData.findUnique({
        where: { url: cacheKey },
      });
    }

    if (!cachedData && comicNumberStr) {
      cachedData = await prisma.cachedComicData.findUnique({
        where: { url: comicNumberStr },
      });
    }

    if (!cachedData) {
      return handleNotFound();
    }

    let comicName = "Unknown Comic";
    try {
      if (cacheKey) {
        const mapping = await prisma.nameNumberMap.findUnique({
          where: { url: cacheKey },
        });
        if (mapping?.name) {
          comicName = mapping.name;
        } else if (cachedData.name) {
          comicName = cachedData.name;
        }
      } else if (cachedData.name) {
        comicName = cachedData.name;
      }
    } catch (nameError) {
      console.error("Error fetching from nameNumberMap:", nameError);
    }

    const now = new Date();
    const cacheAge = cachedData.lastUpdated ? now.getTime() - new Date(cachedData.lastUpdated).getTime() : null;
    const cacheAgeHours = cacheAge ? Math.round(cacheAge / (60 * 60 * 1000)) : 'unknown';

    return NextResponse.json({
      message: 'Cached comic data retrieved successfully.',
      data: {
        ...cachedData,
        name: comicName || cachedData.name || "Unknown Comic"
      },
      cached: true,
      cacheAge: cacheAgeHours + ' hours old'
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cached comic data:", error);
    return handleDatabaseError();
  }
});

export const POST = requireAuth(async (request: NextRequest, _session) => {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { urls } = requestBody;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ message: 'No valid URLs provided' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ message: 'Maximum 50 URLs per request.' }, { status: 400 });
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
      return NextResponse.json({
        message: 'No valid URLs could be processed.',
        data: {}
      }, { status: 200 });
    }

    let cachedComics = await prisma.cachedComicData.findMany({
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
        const legacyCachedComics = await prisma.cachedComicData.findMany({
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

    const result: Record<string, Record<string, unknown>> = {};

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
          ...createFallbackComicData(url),
          url: url
        };
      }
    }

    return NextResponse.json({
      message: `Cached data retrieved for ${Object.keys(result).length} comics.`,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('Error in bulk cached comic data route:', error);
    return handleDatabaseError();
  }
});