import { prisma } from '@/lib/prisma'
import { normalizeUrl, createFallbackComicData, mapBackendDataToExpectedFormat, BackendComicData } from '@/lib/comic-utils'
import { upsertComicData } from '@/lib/comic-cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

type CachedComicData = {
  price: string | null;
  author: string | null;
  lastUpdated: Date | null;
};

function shouldUpdateCache(cachedData: CachedComicData, cacheAge: number): boolean {
  if (cacheAge > 24 * 60 * 60 * 1000) return true;
  if (!cachedData.price || cachedData.price === "Price unavailable") return true;
  if (!cachedData.author || cachedData.author === "Unknown author") return true;
  if (cacheAge > 12 * 60 * 60 * 1000) return true;
  return false;
}

async function fetchComicDataFromBackend(url: string): Promise<BackendComicData | null> {
  const maxRetries = 2;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const backendUrl = process.env.BACKEND_URL;
      const encodedUrl = encodeURIComponent(url);

      const response = await fetch(`${backendUrl}/get_comic_information_api?url=${encodedUrl}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-API-Key': process.env.FLASK_API_KEY || ''
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend responded with status ${response.status}: ${errorText}`);

        if (response.status === 404 && retries === 0) {
          const postResponse = await fetch(`${backendUrl}/get_comic_information`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FLASK_API_KEY || '' },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(30000)
          });

          if (postResponse.ok) {
            const data = await postResponse.json();
            return mapBackendDataToExpectedFormat(data.result || data);
          }
        }

        throw new Error(`Backend responded with status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Backend error: ${data.error}`);
      }

      const resultData = data.result || data;

      if (
        resultData &&
        typeof resultData === 'object' &&
        ((resultData.price && resultData.price !== "Price unavailable") ||
          resultData.title ||
          resultData.author ||
          resultData.Autor)
      ) {
        return mapBackendDataToExpectedFormat(resultData);
      } else {
        throw new Error("Backend returned incomplete data");
      }
    } catch (error) {
      console.error(`Error fetching from backend for ${url} (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      retries++;

      if (retries <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return null;
      }
    }
  }

  return null;
}

export const POST = requireAuth(async (request: NextRequest, _session) => {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { urls } = requestBody;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ message: 'No valid URLs provided' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ message: 'Maximum 50 URLs per request.' }, { status: 400 });
    }

    const validUrls = urls.filter((url: string) => {
      try {
        let urlToCheck = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          urlToCheck = 'https://' + url;
        }
        new URL(urlToCheck);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json({ message: 'No valid URLs provided' }, { status: 400 });
    }

    const comicData: Record<string, Record<string, unknown>> = {};
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
      return NextResponse.json({ message: 'No valid URLs after normalization', data: {} }, { status: 200 });
    }

    let cachedComics = await prisma.cachedComicData.findMany({
      where: { url: { in: normalizedUrls } }
    });

    if (cachedComics.length < normalizedUrls.length && comicNumbers.length > 0) {
      const foundUrls = new Set(cachedComics.map(comic => comic.url));
      const missingComicNumbers = Array.from(urlToComicNumberMap.entries())
        .filter(([url, number]) => !foundUrls.has(url) && number !== null)
        .map(([_, number]) => number);

      if (missingComicNumbers.length > 0) {
        const legacyCachedComics = await prisma.cachedComicData.findMany({
          where: { url: { in: missingComicNumbers as string[] } }
        });
        cachedComics = [...cachedComics, ...legacyCachedComics];
      }
    }

    const comicDataByUrl = new Map<string, CachedComicData & Record<string, unknown>>();
    cachedComics.forEach(comic => comicDataByUrl.set(comic.url, comic));

    for (const url of validUrls) {
      const normalizedUrl = urlMapping.get(url) || normalizeUrl(url);

      if (comicDataByUrl.has(normalizedUrl)) {
        const cachedComic = comicDataByUrl.get(normalizedUrl)!;
        const cacheAge = cachedComic.lastUpdated ? (Date.now() - new Date(cachedComic.lastUpdated).getTime()) : Infinity;
        const needsUpdate = shouldUpdateCache(cachedComic, cacheAge);

        comicData[url] = {
          ...createResultFromCachedData(cachedComic, url),
          fromCache: true,
          needsUpdate
        };

        if (needsUpdate) {
          comicsToUpdate.push({ url, cacheKey: normalizedUrl });
        }
      } else {
        const comicNumber = urlToComicNumberMap.get(normalizedUrl);

        if (comicNumber && comicDataByUrl.has(comicNumber)) {
          const cachedComic = comicDataByUrl.get(comicNumber)!;
          const cacheAge = cachedComic.lastUpdated ? (Date.now() - new Date(cachedComic.lastUpdated).getTime()) : Infinity;
          const needsUpdate = shouldUpdateCache(cachedComic, cacheAge);

          comicData[url] = {
            ...createResultFromCachedData(cachedComic, url),
            fromCache: true,
            needsUpdate
          };

          if (needsUpdate) {
            comicsToUpdate.push({ url, cacheKey: normalizedUrl });
          }
        } else {
          comicData[url] = createFallbackComicData(url);
          comicsToUpdate.push({ url, cacheKey: normalizedUrl });
        }
      }
    }

    if (comicsToUpdate.length > 0) {
      backgroundUpdateComics(comicsToUpdate).catch((err) => {
        console.error('Background comic update failed:', err);
      });
    }

    return NextResponse.json({ data: comicData }, { status: 200 });

  } catch (error) {
    console.error('Error in bulk comic data route:', error);
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 });
  }
});

function createResultFromCachedData(cachedComic: { price?: string | null; author?: string | null; drawer?: string | null; release?: string | null; type?: string | null; pageAmount?: string | null; stories?: string | null; binding?: string | null; ISBN?: string | null; deliverableTo?: string | null; deliveryFrom?: string | null; articleNumber?: string | null; format?: string | null; color?: string | null; name?: string | null; title?: string | null; lastUpdated?: Date | string | null }, url: string) {
  const comicName = cachedComic.name || cachedComic.title || 'Unknown Comic';

  return {
    price: cachedComic.price || 'Price unavailable',
    author: cachedComic.author || 'Unknown author',
    drawer: cachedComic.drawer || 'Unknown artist',
    release: cachedComic.release || 'Release date unavailable',
    type: cachedComic.type || 'Comic',
    pageAmount: cachedComic.pageAmount || 'Unknown',
    stories: cachedComic.stories || '',
    binding: cachedComic.binding || '',
    ISBN: cachedComic.ISBN || '',
    deliverableTo: cachedComic.deliverableTo || 'Check website for availability',
    deliveryFrom: cachedComic.deliveryFrom || '',
    articleNumber: cachedComic.articleNumber || '',
    format: cachedComic.format || '',
    color: cachedComic.color || '',
    url,
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

          if (!freshData) return;

          if (
            !freshData.price ||
            freshData.price === "Price unavailable" ||
            !freshData.author ||
            freshData.author === "Unknown author"
          ) {
            return;
          }

          await updatePrismaCache(comic.cacheKey, freshData);
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

async function updatePrismaCache(cacheKey: string, mappedData: BackendComicData) {
  if (!cacheKey) {
    console.error("Invalid cacheKey provided to updatePrismaCache");
    return;
  }

  try {
    if (mappedData.price && mappedData.price !== "Price unavailable") {
      await upsertComicData(cacheKey, mappedData);
    }

    return true;
  } catch (error) {
    console.error("Error updating Prisma cache:", error);
    return false;
  }
}