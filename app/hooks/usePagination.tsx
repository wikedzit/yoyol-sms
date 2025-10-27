import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const goToPrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  const goToPage = (page: number) =>
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  return {
    currentPage,
    totalPages,
    paginatedItems,
    startIndex,
    goToNextPage,
    goToPrevPage,
    goToPage,
    setCurrentPage,
  };
}
