'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type FoldLoadingOverlayProps = {
  text?: string;
  subtext?: string;
  className?: string;
};

export function FoldLoadingOverlay({
  text = 'Shapeの旅を読み込んでいます...',
  subtext = '',
  className,
}: FoldLoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-start pt-12 md:pt-16 bg-black/75 backdrop-blur-xl px-4',
        className
      )}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/10 to-white/5 px-6 py-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)]">
        {/* Ambient textures */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_75%_10%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.06),transparent_35%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-screen"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />

        <div className="relative flex flex-col items-center gap-5 text-center">
          {/* Crane loader */}
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-black/30 backdrop-blur">
              <Image
                src="/origami-crane.gif"
                alt="Origami crane loading"
                width={200}
                height={200}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Generative Origami</p>
            <p className="text-lg font-semibold text-white">{text}</p>
            {subtext && <p className="text-sm text-white/70">{subtext}</p>}
          </div>

          {/* Progress pulse */}
          <div className="flex w-full max-w-xs items-center gap-3 text-xs text-white/60">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <span className="tracking-[0.2em] uppercase">Katachi Gen</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
          <div className="flex w-full max-w-xs items-center gap-2">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="h-1 flex-1 rounded-full bg-white/25"
                style={{
                  animation: 'pulse 1.7s ease-in-out infinite',
                  animationDelay: `${index * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
