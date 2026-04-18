'use client';

import { useState, use } from 'react';
import { Item } from '@/components/item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, Filter, XCircle, SlidersHorizontal, Star, StickyNote } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoginButton } from '@/components/loginButton';
import { useWishlistData } from './hooks/useWishlistData';
import { useLoginStatus } from './hooks/useLoginStatus';
import { usePriorities } from './hooks/usePriorities';
import { useNotes } from './hooks/useNotes';
import { useDependencies } from './hooks/useDependencies';
import { useFilteredAndSortedData, FilterOption } from './utils/sorting';
import { WishlistSkeleton } from '@/components/wishlist/WishlistSkeleton';

const ITEMS_PER_PAGE = 12;

export default function Page({ params }: { params: Promise<{ urlEnding: string }> }) {
  const [lastReloadTime] = useState<number>(Date.now());
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [newFilter, setNewFilter] = useState<FilterOption>({ field: 'name', operator: 'contains', value: '' });

  const resolvedParams = use(params);
  const { urlEnding } = resolvedParams;

  const { wishlistData, loading, setLoading, error, setError } = useWishlistData(urlEnding);
  const { isLoggedIn } = useLoginStatus(urlEnding);
  const { priorities, setPriorities, hasPriorityItems, sortField, setSortField, sortDirection, setSortDirection } = usePriorities(urlEnding, isLoggedIn, lastReloadTime);
  const { notes, hasNotes, showOnlyWithNotes, setShowOnlyWithNotes } = useNotes(urlEnding, isLoggedIn);
  const { dependencies, hasDependencies } = useDependencies(urlEnding, wishlistData);

  const filteredAndSortedData = useFilteredAndSortedData(wishlistData, filters, showOnlyWithNotes, sortField, sortDirection, priorities, notes, dependencies);

  const handlePriorityChange = (url: string, priority: number) => {
    setPriorities(prev => {
      const updated = { ...prev, [url]: priority };
      return updated;
    });
  };

  const handleSortChange = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const addFilter = () => {
    if (newFilter.value.trim() === '') return;
    setFilters(prev => [...prev, { ...newFilter }]);
    setNewFilter({ field: 'name', operator: 'contains', value: '' });
    setShowFilterDialog(false);
  };

  const removeFilter = (index: number) => {
    setFilters(prev => { const updated = [...prev]; updated.splice(index, 1); return updated; });
  };

  const getFilterDescription = (filter: FilterOption): string => {
    const fieldMap: Record<string, string> = { 'name': 'Name', 'comicData.price': 'Preis', 'comicData.author': 'Autor', 'comicData.drawer': 'Zeichner', 'comicData.release': 'Erscheinungsdatum', 'comicData.type': 'Typ', 'comicData.pageAmount': 'Seitenzahl', 'comicData.binding': 'Bindung', 'comicData.ISBN': 'ISBN' };
    const operatorMap: Record<string, string> = { 'contains': 'enthält', 'equals': 'ist gleich', 'greaterThan': 'größer als', 'lessThan': 'kleiner als' };
    return `${fieldMap[filter.field] || filter.field} ${operatorMap[filter.operator] || filter.operator} ${filter.value}`;
  };

  const clearAllFilters = () => setFilters([]);

  const sortLabel = sortField === 'priority' ? 'Priorität' : sortField === 'name' ? 'Name' : sortField === 'price' ? 'Preis' : sortField === 'release' ? 'Erscheinungsdatum' : sortField === 'author' ? 'Autor' : sortField === 'type' ? 'Typ' : sortField === 'pageAmount' ? 'Seitenzahl' : sortField === 'binding' ? 'Bindung' : sortField === 'hasNote' ? 'Notizen' : sortField === 'hasDependency' ? 'Abhängigkeiten' : sortField.charAt(0).toUpperCase() + sortField.slice(1);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 px-6 py-10">
      <Card className="w-full max-w-7xl shadow-xl border border-gray-800 rounded-3xl bg-gray-900 text-white p-6 md:p-8">
        <CardHeader className="text-center mb-6 relative">
          <div className="absolute top-0 right-0"><LoginButton currentUrlEnding={urlEnding} /></div>
          <CardTitle className="text-4xl font-extrabold text-gray-100">
            Wunschliste von <span className="text-indigo-600">{urlEnding}</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && !wishlistData ? (
            <WishlistSkeleton />
          ) : error && !wishlistData ? (
            <div className="text-center py-10">
              <div className="text-xl text-red-500 mb-4">Fehler: {error}</div>
              <button onClick={() => { setLoading(true); setError(null); window.location.reload(); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white">Erneut versuchen</button>
            </div>
          ) : wishlistData && wishlistData.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Sortieren nach: {sortLabel} {sortDirection === 'asc' ? '↑' : '↓'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700 w-56 shadow-lg shadow-black/50">
                      <DropdownMenuLabel className="text-gray-300 font-bold">Sortieroptionen</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />

                      {hasPriorityItems && (
                        <>
                          <DropdownMenuItem className={`cursor-pointer ${sortField === 'priority' ? 'bg-indigo-700' : ''}`} onClick={() => handleSortChange('priority')}>
                            <Star className="h-4 w-4 mr-2" />Priorität {sortField === 'priority' && <span className="ml-auto">{sortDirection === 'asc' ? '(1→10)' : '(10→1)'}</span>}
                          </DropdownMenuItem>
                        </>
                      )}

                      {[
                        ['name', 'Name'], ['price', 'Preis'], ['release', 'Erscheinungsdatum'],
                        ['author', 'Autor'], ['type', 'Typ'], ['pageAmount', 'Seitenzahl'], ['binding', 'Bindung']
                      ].map(([field, label]) => (
                        <DropdownMenuItem key={field} className={`cursor-pointer ${sortField === field ? 'bg-indigo-700' : ''}`} onClick={() => handleSortChange(field)}>
                          {label} {sortField === field && <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </DropdownMenuItem>
                      ))}

                      {hasNotes && (
                        <DropdownMenuItem className={`cursor-pointer ${sortField === 'hasNote' ? 'bg-indigo-700' : ''}`} onClick={() => handleSortChange('hasNote')}>
                          <StickyNote className="h-4 w-4 mr-2" />Notizen {sortField === 'hasNote' && <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </DropdownMenuItem>
                      )}

                      {hasDependencies && (
                        <DropdownMenuItem className={`cursor-pointer ${sortField === 'hasDependency' ? 'bg-indigo-700' : ''}`} onClick={() => handleSortChange('hasDependency')}>
                          Abhängigkeiten {sortField === 'hasDependency' && <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {isLoggedIn && hasNotes && (
                    <Button variant={showOnlyWithNotes ? "default" : "outline"} className={showOnlyWithNotes ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"} onClick={() => setShowOnlyWithNotes(!showOnlyWithNotes)}>
                      <StickyNote className="h-4 w-4 mr-2" />{showOnlyWithNotes ? "Alle anzeigen" : "Nur mit Notizen"}
                    </Button>
                  )}

                  <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                        <Filter className="h-4 w-4 mr-2" />Filter hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-gray-100 border-gray-700 shadow-lg shadow-black/50">
                      <DialogHeader>
                        <DialogTitle className="text-gray-100 font-bold">Filter hinzufügen</DialogTitle>
                        <DialogDescription className="text-gray-300">Erstellen Sie einen Filter, um Ihre Wunschliste einzugrenzen.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-2 sm:gap-4">
                          <Label htmlFor="field" className="sm:text-right text-gray-200">Feld</Label>
                          <select id="field" value={newFilter.field} onChange={(e) => setNewFilter({...newFilter, field: e.target.value})} className="bg-gray-700 border-gray-600 rounded-md p-2 text-white" aria-label="Filter field">
                            <option value="name">Name</option><option value="comicData.price">Preis</option><option value="comicData.author">Autor</option><option value="comicData.drawer">Zeichner</option><option value="comicData.release">Erscheinungsdatum</option><option value="comicData.type">Typ</option><option value="comicData.pageAmount">Seitenzahl</option><option value="comicData.binding">Bindung</option><option value="comicData.ISBN">ISBN</option>
                            {hasNotes && <option value="hasNote">Notizen</option>}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-2 sm:gap-4">
                          <Label htmlFor="operator" className="sm:text-right text-gray-200">Operator</Label>
                          <select id="operator" value={newFilter.operator} onChange={(e) => setNewFilter({...newFilter, operator: e.target.value as FilterOption['operator']})} className="bg-gray-700 border-gray-600 rounded-md p-2 text-white" aria-label="Filter operator">
                            <option value="contains">Enthält</option><option value="equals">Ist gleich</option><option value="greaterThan">Größer als</option><option value="lessThan">Kleiner als</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-2 sm:gap-4">
                          <Label htmlFor="value" className="sm:text-right text-gray-200">Wert</Label>
                          <Input id="value" placeholder="Filterwert..." value={newFilter.value} onChange={(e) => setNewFilter({...newFilter, value: e.target.value})} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={addFilter} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!newFilter.value.trim()}>Filter hinzufügen</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {filters.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {filters.map((filter, index) => (
                        <Badge key={`filter-${index}`} variant="secondary" className="bg-purple-900/50 text-purple-200 flex items-center gap-1">
                          {getFilterDescription(filter)}
                          <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter(index)} />
                        </Badge>
                      ))}
                      {filters.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800" onClick={clearAllFilters}>Alle löschen</Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {filters.length > 0 && filteredAndSortedData && (
                <div className="mb-4 text-sm text-gray-400">Zeige {filteredAndSortedData.length} von {wishlistData.length} Comics</div>
              )}

              {filteredAndSortedData && filteredAndSortedData.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredAndSortedData.slice(0, visibleCount).map((item, index) => (
                      <Item key={index} name={item.name} url={item.link} image={item.image} comicData={item.comicData} isLoggedIn={isLoggedIn} urlEnding={urlEnding} onPriorityChange={handlePriorityChange} wishlistItems={wishlistData?.map(item => ({ name: item.name, url: item.link })) || []} />
                    ))}
                  </div>
                  {visibleCount < filteredAndSortedData.length && (
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                        Mehr anzeigen ({filteredAndSortedData.length - visibleCount} verbleibend)
                      </Button>
                    </div>
                  )}
                </>
              ) : showOnlyWithNotes ? (
                <div className="text-center py-10 text-xl text-gray-500">
                  Keine Comics mit Notizen gefunden
                  <div className="mt-4"><Button variant="outline" onClick={() => setShowOnlyWithNotes(false)} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">Alle anzeigen</Button></div>
                </div>
              ) : filters.length > 0 ? (
                <div className="text-center py-10 text-xl text-gray-500">
                  Keine Comics entsprechen den aktuellen Filtern
                  <div className="mt-4"><Button variant="outline" onClick={clearAllFilters} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">Filter löschen</Button></div>
                </div>
              ) : (
                <div className="text-center py-10 text-xl text-gray-500">Keine Comics in der Wunschliste gefunden</div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-xl text-gray-500">Keine Comics in der Wunschliste gefunden</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}