'use client';

import Link from 'next/link';
import { useHeader } from '@/contexts/header-context';

export function AnnouncementBar() {
  const { isInMintView } = useHeader();

  // Hide announcement bar when in mint view
  if (isInMintView) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[40px] bg-gray-700 text-white text-center text-sm font-medium flex flex-col items-center justify-center">
      <div>
        🏆{' '}
        <Link
          href="https://x.com/Shape_L2/status/1962942181271834826"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
          style={{ textDecorationSkipInk: 'none' }}
        >
          1<sup className="text-[0.6em]">st</sup> Place
        </Link>
        ,{' '}
        <Link
          href="https://shape.network/shapecraft"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
          style={{ textDecorationSkipInk: 'none' }}
        >
          SHAPECRAFT<sup className="text-[0.6em]">2</sup>
        </Link>
        {' '}—{' '}Mainnet soon ⚫️
      </div>
    </div>
  );
}
