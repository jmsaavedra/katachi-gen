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
      <div className="relative w-full max-w-lg px-6 py-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-montserrat)]">
            Katachi Gen
          </div>

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
            <span className="tracking-[0.2em] uppercase">Loading</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
          <div className="flex w-full max-w-xs items-center gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  style={{
                    animation: `kgBarSlide 2.2s ease-in-out infinite`,
                    animationDelay: `${index * -0.5}s`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes kgBarSlide {
          0% {
            transform: translateX(-115%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(115%);
          }
        }
      `}</style>
    </div>
  );
}
