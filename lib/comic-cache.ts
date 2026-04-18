import { prisma } from './prisma';

type ComicDataFields = {
  price?: string;
  author?: string;
  drawer?: string;
  release?: string;
  type?: string;
  pageAmount?: string;
  stories?: string;
  binding?: string;
  ISBN?: string;
  deliverableTo?: string;
  deliveryFrom?: string;
  articleNumber?: string;
  format?: string;
  color?: string;
  name?: string;
};

export async function upsertComicData(url: string, data: ComicDataFields): Promise<void> {
  const comicName = data.name || 'Comic information unavailable';

  await prisma.cachedComicData.upsert({
    where: { url },
    update: {
      price: data.price || '',
      author: data.author || '',
      drawer: data.drawer || '',
      release: data.release || '',
      type: data.type || '',
      pageAmount: data.pageAmount || '',
      stories: data.stories || '',
      binding: data.binding || '',
      ISBN: data.ISBN || '',
      deliverableTo: data.deliverableTo || '',
      deliveryFrom: data.deliveryFrom || '',
      articleNumber: data.articleNumber || '',
      format: data.format || '',
      color: data.color || '',
      name: comicName,
      lastUpdated: new Date(),
    },
    create: {
      url,
      price: data.price || '',
      author: data.author || '',
      drawer: data.drawer || '',
      release: data.release || '',
      type: data.type || '',
      pageAmount: data.pageAmount || '',
      stories: data.stories || '',
      binding: data.binding || '',
      ISBN: data.ISBN || '',
      deliverableTo: data.deliverableTo || '',
      deliveryFrom: data.deliveryFrom || '',
      articleNumber: data.articleNumber || '',
      format: data.format || '',
      color: data.color || '',
      name: comicName,
      lastUpdated: new Date(),
    },
  });

  if (comicName && comicName !== 'Comic information unavailable') {
    await prisma.nameNumberMap.upsert({
      where: { url },
      update: { name: comicName },
      create: { url, name: comicName },
    });
  }
}