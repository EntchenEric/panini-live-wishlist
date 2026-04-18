import { useMemo } from 'react';
import { EnhancedWishlistItem, ComicData } from '../hooks/useWishlistData';

type FilterOption = {
  field: string;
  operator: 'contains' | 'equals' | 'greaterThan' | 'lessThan';
  value: string;
};

function getValueByField(item: EnhancedWishlistItem, field: string, priorities: Record<string, number>, notes: Record<string, boolean>): string | number | boolean | undefined {
  if (field === 'name') return item.name;
  if (field === 'priority') return priorities[item.link] || 999;
  if (field === 'hasNote') return notes[item.link] || false;
  if (field.startsWith('comicData.')) {
    const nestedField = field.replace('comicData.', '');
    return item.comicData[nestedField as keyof ComicData];
  }
  return item.comicData[field as keyof ComicData];
}

function filterItems(items: EnhancedWishlistItem[], filters: FilterOption[], showOnlyWithNotes: boolean, notes: Record<string, boolean>, priorities: Record<string, number>): EnhancedWishlistItem[] {
  return items.filter(item => {
    if (showOnlyWithNotes && !notes[item.link]) return false;
    if (filters.length === 0) return true;

    return filters.every(filter => {
      const itemValue = getValueByField(item, filter.field, priorities, notes);
      const stringValue = String(itemValue).toLowerCase();
      const filterValue = filter.value.toLowerCase();

      switch (filter.operator) {
        case 'contains': return stringValue.includes(filterValue);
        case 'equals': return stringValue === filterValue;
        case 'greaterThan':
          if (filter.field === 'comicData.price' || filter.field === 'comicData.pageAmount') {
            const numValue = parseFloat(String(itemValue).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            const numFilterValue = parseFloat(filterValue) || 0;
            return numValue > numFilterValue;
          }
          return stringValue > filterValue;
        case 'lessThan':
          if (filter.field === 'comicData.price' || filter.field === 'comicData.pageAmount') {
            const numValue = parseFloat(String(itemValue).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            const numFilterValue = parseFloat(filterValue) || 0;
            return numValue < numFilterValue;
          }
          return stringValue < filterValue;
        default: return true;
      }
    });
  });
}

function enrichItems(items: EnhancedWishlistItem[], priorities: Record<string, number>, notes: Record<string, boolean>, dependencies: Record<string, string>): EnhancedWishlistItem[] {
  return items.map(item => {
    const enrichedItem = { ...item };

    if (priorities[item.link]) {
      enrichedItem.comicData = { ...enrichedItem.comicData, priority: priorities[item.link] };
    }
    if (notes[item.link]) {
      enrichedItem.comicData = { ...enrichedItem.comicData, hasNote: true };
    }
    if (dependencies[item.link]) {
      enrichedItem.comicData = { ...enrichedItem.comicData, hasDependency: true, dependencyUrl: dependencies[item.link] };
    }

    return enrichedItem;
  });
}

export function useFilteredAndSortedData(
  wishlistData: Array<EnhancedWishlistItem> | null,
  filters: FilterOption[],
  showOnlyWithNotes: boolean,
  sortField: string,
  sortDirection: 'asc' | 'desc',
  priorities: Record<string, number>,
  notes: Record<string, boolean>,
  dependencies: Record<string, string>
) {
  return useMemo(() => {
    if (!wishlistData) return null;

    // Pre-compute dependency chains once (O(n)) instead of inside sort comparator (O(n log n) times)
    const chainCache = new Map<string, string[]>();

    const getDependencyChain = (item: EnhancedWishlistItem, visited: Set<string> = new Set()): string[] => {
      if (chainCache.has(item.link)) return chainCache.get(item.link)!;
      if (visited.has(item.link)) return [];
      visited.add(item.link);

      const chain = [item.link];
      const dependencyUrl = dependencies[item.link];

      if (dependencyUrl) {
        const dependencyItem = wishlistData?.find(i => i.link === dependencyUrl);
        if (dependencyItem) {
          chain.unshift(...getDependencyChain(dependencyItem, visited));
        }
      }

      chainCache.set(item.link, chain);
      return chain;
    };

    // Pre-compute all chains
    wishlistData.forEach(item => getDependencyChain(item));

    const filtered = filterItems(wishlistData, filters, showOnlyWithNotes, notes, priorities);
    const enriched = enrichItems(filtered, priorities, notes, dependencies);

    return enriched.sort((a, b) => {
      const chainA = chainCache.get(a.link) || [a.link];
      const chainB = chainCache.get(b.link) || [b.link];

      if (chainA.includes(b.link)) return 1;
      if (chainB.includes(a.link)) return -1;

      const rootA = chainA[0];
      const rootB = chainB[0];

      if (rootA !== rootB) {
        const rootItemA = wishlistData?.find(i => i.link === rootA);
        const rootItemB = wishlistData?.find(i => i.link === rootB);
        const rootPriorityA = rootItemA ? (priorities[rootItemA.link] || 999) : 999;
        const rootPriorityB = rootItemB ? (priorities[rootItemB.link] || 999) : 999;

        if (rootPriorityA !== rootPriorityB) return rootPriorityA - rootPriorityB;

        const rootCompare = rootA.localeCompare(rootB);
        if (rootCompare !== 0) return rootCompare;
      }

      const priorityA = priorities[a.link] || 999;
      const priorityB = priorities[b.link] || 999;

      if (priorityA !== priorityB) return priorityA - priorityB;

      let valueA, valueB;

      if (sortField === 'name') { valueA = a.name; valueB = b.name; }
      else if (sortField === 'price') { valueA = parseFloat(a.comicData.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0; valueB = parseFloat(b.comicData.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0; }
      else if (sortField === 'pageAmount') { valueA = parseInt(a.comicData.pageAmount?.replace(/[^0-9]/g, '') || '0'); valueB = parseInt(b.comicData.pageAmount?.replace(/[^0-9]/g, '') || '0'); }
      else if (sortField === 'priority') { return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA; }
      else if (sortField === 'hasNote') { valueA = notes[a.link] ? 1 : 0; valueB = notes[b.link] ? 1 : 0; return sortDirection === 'asc' ? valueA - valueB : valueB - valueA; }
      else if (sortField === 'hasDependency') { valueA = dependencies[a.link] ? 1 : 0; valueB = dependencies[b.link] ? 1 : 0; return sortDirection === 'asc' ? valueA - valueB : valueB - valueA; }
      else { valueA = a.comicData[sortField as keyof ComicData] || ''; valueB = b.comicData[sortField as keyof ComicData] || ''; }

      let comparison;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).toLowerCase().localeCompare(String(valueB).toLowerCase());
      }

      return sortField === 'priority' ? comparison : sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [wishlistData, filters, showOnlyWithNotes, sortField, sortDirection, priorities, notes, dependencies]);
}

export type { FilterOption };