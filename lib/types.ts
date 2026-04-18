export type ComicData = {
  price: string;
  author: string;
  drawer: string;
  release: string;
  type: string;
  pageAmount: string;
  stories: string;
  binding: string;
  ISBN: string;
  deliverableTo: string;
  deliveryFrom: string;
  name: string;
  articleNumber?: string;
  format?: string;
  color?: string;
  fromCache?: boolean;
  fallback?: boolean;
  cacheAge?: string;
  priority?: number;
  hasNote?: boolean;
  hasDependency?: boolean;
  dependencyUrl?: string;
};

export type EnhancedWishlistItem = {
  link: string;
  name: string;
  image: string;
  comicData: ComicData;
};