"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Komponen akan tetap muncul meskipun hanya ada 1 halaman agar user tahu fitur paginasi sudah terpasang
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2 py-4 border-t-2 border-gray-100">
      <p className="text-sm font-bold text-gray-500">
        Menampilkan <span className="text-black">{totalItems > 0 ? (currentPage * itemsPerPage) + 1 : 0}</span> - <span className="text-black">{Math.min((currentPage + 1) * itemsPerPage, totalItems)}</span> dari <span className="text-black">{totalItems}</span> data
      </p>

      <div className="flex items-center gap-2">
        {/* Tombol Previous */}
        <button
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-2.5 border-2 border-gray-300 rounded-xl bg-white text-black font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-100 transition-all shadow-sm flex items-center gap-1"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Nomor Halaman */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`w-11 h-11 rounded-xl font-black text-base border-2 transition-all shadow-md active:scale-95 ${
                currentPage === i
                  ? 'bg-purple-700 border-purple-950 text-white shadow-purple-200'
                  : 'bg-white border-gray-300 text-black hover:border-purple-500 hover:text-purple-700'
              }`}
            >
              {i + 1}
            </button>
          )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3))}
        </div>

        {/* Tombol Next */}
        <button
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-2.5 border-2 border-gray-300 rounded-xl bg-white text-black font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-100 transition-all shadow-sm flex items-center gap-1"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
