import { NextRequest, NextResponse } from 'next/server';

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

function extractFieldKeys(obj: any, parentKey = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  
  return Object.entries(obj).flatMap(([key, value]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [currentKey, ...extractFieldKeys(value, currentKey)];
    }
    return [currentKey];
  });
}

function extractFieldsWithVariations(data: any) {
  const resultData = data.result || data;
  
  return {
    price: resultData.price || "Not found",
    author: resultData.Autor || resultData.author || "Not found",
    title: resultData.title || "Not found",
    name: resultData.name || resultData.title || "Not found",
    drawer: resultData.Zeichner || resultData.drawer || resultData.Artist || "Not found",
    release: resultData.Erscheinungsdatum || resultData["Erscheint am"] || resultData.releaseDate || "Not found",
    type: resultData.Produktart || resultData.Typ || resultData.type || "Not found",
    pageAmount: resultData.Seitenzahl || resultData.Seitenanzahl || resultData.pageAmount || resultData["Seiten"] || "Not found",
    storys: resultData.Storys || resultData.storys || resultData.Stories || "Not found",
    binding: resultData.Bindung || resultData.binding || resultData.Binding || "Not found",
    ISBN: resultData.ISBN || resultData.isbn || "Not found",
    deliverableTo: resultData["Lieferbar in folgende Länder"] || resultData.deliverableTo || resultData.Lieferbar || "Not found",
    deliveryFrom: resultData["Versand von"] || resultData.deliveryFrom || "Not found",
    articleNumber: resultData["Artikel-Nr."] || resultData.articleNumber || resultData.Artikelnummer || "Not found",
    format: resultData.Format || resultData.format || "Not found",
    color: resultData["Farbe/Schwarz-Weiß"] || resultData.color || resultData.Farbe || "Not found",
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse(
      JSON.stringify({ message: 'URL parameter is required' }),
      { status: 400 }
    );
  }
  
  try {
    const normalizedUrl = normalizeUrl(url);
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const encodedUrl = encodeURIComponent(normalizedUrl);
    
    const apiUrl = `${backendUrl}/get_comic_information_api?url=${encodedUrl}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const postResponse = await fetch(`${backendUrl}/get_comic_information`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!postResponse.ok) {
        return new NextResponse(
          JSON.stringify({ 
            message: 'Both endpoints failed',
            getError: `${response.status} - ${errorText}`,
            postError: `${postResponse.status} - ${await postResponse.text()}`
          }),
          { status: 500 }
        );
      }
      
      const postData = await postResponse.json();
      const resultData = postData.result || postData;
      
      return new NextResponse(
        JSON.stringify({ 
          message: 'Data from POST endpoint',
          rawData: postData,
          resultData: resultData,
          allFields: extractFieldKeys(postData),
          extractedFields: extractFieldsWithVariations(postData),
          parsedFromPost: true
        }),
        { status: 200 }
      );
    }
    
    const data = await response.json();
    const resultData = data.result || data;
    
    return new NextResponse(
      JSON.stringify({ 
        message: 'Debug info for comic data fetch',
        url: normalizedUrl,
        encodedUrl: encodedUrl,
        apiUrl: apiUrl,
        rawResponse: data,
        resultData: resultData,
        hasResult: data.hasOwnProperty('result'),
        isValidPrice: resultData.price && resultData.price !== "Price unavailable",
        isValidAuthor: resultData.Autor || resultData.author,
        allFields: extractFieldKeys(data),
        rawFields: Object.keys(resultData).reduce((acc, key) => {
          acc[key] = resultData[key];
          return acc;
        }, {} as Record<string, any>),
        extractedFields: extractFieldsWithVariations(data)
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in debug_comic_data:', error);
    return new NextResponse(
      JSON.stringify({ 
        message: 'Error fetching comic data for debugging',
        error: String(error) 
      }),
      { status: 500 }
    );
  }
} 