export function normalizeUrl(url: string): string {
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

export function extractComicNumber(url: string): string | null {
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

export function extractComicName(url: string): string {
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

export function createFallbackComicData(url: string) {
  return {
    price: "Price unavailable",
    author: "Unknown author",
    drawer: "Unknown artist",
    release: "Release date unavailable",
    type: "Comic",
    pageAmount: "Unknown",
    stories: "",
    binding: "",
    ISBN: "",
    deliverableTo: "Check website for availability",
    deliveryFrom: "",
    articleNumber: "",
    format: "",
    color: "",
    fallback: true,
    name: extractComicName(url),
  };
}

type FieldMapping = {
  outputKey: string;
  backendKeys: string[];
  fallback?: string;
};

const COMIC_FIELD_MAPPINGS: FieldMapping[] = [
  { outputKey: 'price', backendKeys: ['price'], fallback: 'Price unavailable' },
  { outputKey: 'author', backendKeys: ['Autor', 'author'] },
  { outputKey: 'drawer', backendKeys: ['Zeichner', 'drawer'] },
  { outputKey: 'release', backendKeys: ['Erscheint am', 'Erscheinungsdatum', 'release'] },
  { outputKey: 'type', backendKeys: ['Produktart', 'Typ', 'type'] },
  { outputKey: 'pageAmount', backendKeys: ['Seitenzahl', 'Seitenanzahl', 'Seiten', 'pageAmount'] },
  { outputKey: 'stories', backendKeys: ['Storys', 'storys', 'Stories'] },
  { outputKey: 'binding', backendKeys: ['Bindung', 'binding', 'Binding'] },
  { outputKey: 'ISBN', backendKeys: ['ISBN', 'isbn'] },
  { outputKey: 'deliverableTo', backendKeys: ['Lieferbar in folgende Länder', 'Lieferbar', 'deliverableTo'] },
  { outputKey: 'deliveryFrom', backendKeys: ['Versand von', 'deliveryFrom'] },
  { outputKey: 'articleNumber', backendKeys: ['Artikel-Nr.', 'Artikelnummer', 'articleNumber'] },
  { outputKey: 'format', backendKeys: ['Format', 'format'] },
  { outputKey: 'color', backendKeys: ['Farbe/Schwarz-Weiß', 'Farbe', 'color'] },
  { outputKey: 'name', backendKeys: ['name', 'title', 'Titel'] },
];

export interface BackendComicData {
  price?: string;
  author?: string;
  Autor?: string;
  Zeichner?: string;
  drawer?: string;
  release?: string;
  'Erscheint am'?: string;
  Erscheinungsdatum?: string;
  type?: string;
  Produktart?: string;
  Typ?: string;
  pageAmount?: string;
  Seitenzahl?: string;
  stories?: string;
  Stories?: string;
  binding?: string;
  Bindung?: string;
  ISBN?: string;
  deliverableTo?: string;
  Lieferbar?: string;
  deliveryFrom?: string;
  articleNumber?: string;
  'Artikel-Nr.'?: string;
  format?: string;
  color?: string;
  Farbe?: string;
  name?: string;
  title?: string;
  Titel?: string;
  [key: string]: unknown;
}

export function mapBackendDataToExpectedFormat(data: BackendComicData) {
  const result: Record<string, string> = {};
  for (const mapping of COMIC_FIELD_MAPPINGS) {
    let value = '';
    for (const key of mapping.backendKeys) {
      if (data[key] && typeof data[key] === 'string') {
        value = data[key] as string;
        break;
      }
    }
    result[mapping.outputKey] = value || mapping.fallback || '';
  }
  return result as {
    price: string; author: string; drawer: string; release: string;
    type: string; pageAmount: string; stories: string; binding: string;
    ISBN: string; deliverableTo: string; deliveryFrom: string;
    articleNumber: string; format: string; color: string; name: string;
  };
}