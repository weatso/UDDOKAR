import React from 'react';

type StatusType = 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' | 'COMPLETED';

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = 'bg-gray-200';
  let textColor = 'text-black';

  let label: string = status; 

  switch (status) {
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
    case 'PENDING':
      bgColor = 'bg-red-200 border-2 border-red-600';
      textColor = 'text-black';
      label = status === 'UNPAID' ? 'BELUM BAYAR' : 'MENUNGGU';
      break;
  }

  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}