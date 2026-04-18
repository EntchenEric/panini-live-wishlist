import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { normalizeUrl, extractComicName, createFallbackComicData, mapBackendDataToExpectedFormat } from '@/lib/comic-utils'
import { upsertComicData } from '@/lib/comic-cache'
import { requireAuth } from '@/lib/auth'

async function getComicNameFromMap(comicUrl: string, fallbackName: string): Promise<string> {
  try {
    const mapping = await prisma.nameNumberMap.findUnique({
      where: { url: comicUrl },
    });
    if (mapping?.name) return mapping.name;
  } catch (error) {
    console.error("Error fetching name from nameNumberMap:", error);
  }
  return fallbackName;
}

export const GET = requireAuth(async (req: NextRequest, _session) => {
    const comicUrl = req.nextUrl.searchParams.get('url');
    const comicNumber = req.nextUrl.searchParams.get('number');
    const forceRefresh = req.nextUrl.searchParams.get('force_refresh') === 'true';

    const backendUrl = process.env.BACKEND_URL;

    if (!comicNumber && !comicUrl) {
        return NextResponse.json({ message: 'Comic number or URL not provided.' }, { status: 400 });
    }

    const comicUrlStr = comicUrl || null;
    const normalizedUrl = comicUrlStr ? normalizeUrl(comicUrlStr) : null;

    const extractedName = comicUrlStr ? extractComicName(comicUrlStr) : "Unknown Comic";

    let comicName = extractedName;
    if (normalizedUrl) {
        comicName = await getComicNameFromMap(normalizedUrl, extractedName);
    } else if (comicNumber) {
        comicName = await getComicNameFromMap(comicNumber, extractedName);
    }

    try {
        if ((normalizedUrl || comicNumber) && !forceRefresh) {
            try {
                let cachedData = null;

                if (normalizedUrl) {
                    cachedData = await prisma.cachedComicData.findUnique({
                        where: { url: normalizedUrl },
                    });
                }

                if (!cachedData && comicNumber) {
                    cachedData = await prisma.cachedComicData.findUnique({
                        where: { url: comicNumber },
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
                        return NextResponse.json({
                            message: 'Comic data retrieved from cache.',
                            data: { ...cachedData, name: comicName },
                            fromCache: true,
                            cacheAge: Math.round(cacheAge / (60 * 60 * 1000)) + ' hours old'
                        }, { status: 200 });
                    }
                }
            } catch (cacheError) {
                console.error("Error fetching from cache:", cacheError);
            }
        }

        if (!comicUrlStr) {
            const fallbackData = createFallbackComicData(comicUrl || "");
            return NextResponse.json({
                message: 'Using fallback comic data.',
                data: fallbackData,
                fromCache: false,
                fallback: true
            }, { status: 200 });
        }

        try {
            const response = await fetch(`${backendUrl}/get_comic_information`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FLASK_API_KEY || '' },
                body: JSON.stringify({ url: comicUrlStr }),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                const fallbackData = createFallbackComicData(comicUrlStr);
                fallbackData.name = comicName;
                return NextResponse.json({
                    message: 'Using fallback comic data due to backend error.',
                    data: fallbackData,
                    fromCache: false,
                    fallback: true
                }, { status: 200 });
            }

            const comicData = await response.json();

            if (comicData.error) {
                const fallbackData = createFallbackComicData(comicUrlStr);
                fallbackData.name = comicName;
                return NextResponse.json({
                    message: 'Using fallback comic data due to backend error.',
                    data: fallbackData,
                    fromCache: false,
                    fallback: true
                }, { status: 200 });
            }

            if (normalizedUrl && comicData.result) {
                const data = typeof comicData.result === 'string' ? JSON.parse(comicData.result) : comicData.result;

                try {
                    const mappedData = mapBackendDataToExpectedFormat(data);
                    const nameFromBackend = mappedData.name || data.name || data.title;
                    const comicNameToSave = nameFromBackend || comicName;

                    await upsertComicData(normalizedUrl, { ...mappedData, name: comicNameToSave });
                } catch (cacheError) {
                    console.error("Error caching comic data:", cacheError);
                }
            }

            const rawData = comicData.result;
            const mappedData = mapBackendDataToExpectedFormat(rawData);
            const backendName = mappedData.name || rawData.name || rawData.title;

            return NextResponse.json({
                message: 'Comic data fetched successfully.',
                data: { ...mappedData, name: backendName || comicName },
                fromCache: false
            }, { status: 200 });
        } catch (fetchError) {
            console.error("Error fetching from backend:", fetchError);

            const fallbackData = createFallbackComicData(comicUrlStr);
            fallbackData.name = comicName;
            return NextResponse.json({
                message: 'Using fallback comic data due to fetch error.',
                data: fallbackData,
                fromCache: false,
                fallback: true
            }, { status: 200 });
        }
    } catch (err) {
        console.error('Error fetching comic data:', err);

        const fallbackData = createFallbackComicData(comicUrlStr || "");
        if (normalizedUrl || comicNumber) {
            fallbackData.name = comicName;
        }
        return NextResponse.json({
            message: 'Using fallback comic data due to error.',
            data: fallbackData,
            fromCache: false,
            fallback: true
        }, { status: 200 });
    }
});