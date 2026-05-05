import React from 'react';

type StatusType = 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' | 'COMPLETED' | 'VOID';

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = 'bg-gray-200';
  let textColor = 'text-black';
  let label: string = status; 

  switch (status) {
    case 'VOID':
      bgColor = 'bg-red-200 border-2 border-red-600';
      textColor = 'text-black';
      label = 'DIBATALKAN';
      break;
    case 'PAID':
    case 'COMPLETED':
      bgColor = 'bg-green-200 border-2 border-green-600';
      textColor = 'text-black';
      label = status === 'PAID' ? 'LUNAS' : 'SELESAI';
      break;
    case 'PARTIAL':
      bgColor = 'bg-yellow-200 border-2 border-yellow-600';
      textColor = 'text-black';
      label = 'CICILAN';
      break;
    case 'UNPAID':
      bgColor = 'bg-orange-200 border-2 border-orange-600';
      textColor = 'text-black';
      label = 'BELUM LUNAS';
      break;
    case 'PENDING':
      bgColor = 'bg-blue-100 border-2 border-blue-400';
      textColor = 'text-black';
      label = 'MENUNGGU';
      break;
  }

  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-tighter ${bgColor} ${textColor} shadow-sm`}>
      {label}
    </span>
  );
}