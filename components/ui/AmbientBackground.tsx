'use client';

import { useMemo } from 'react';

function SoundWaves() {
  const waves = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        size: 300 + i * 180,
        delay: i * 0.8,
        duration: 4 + i * 0.5,
        opacity: 0.15 - i * 0.015,
      })),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {waves.map((wave) => (
        <div
          key={wave.id}
          className="absolute rounded-full border border-blue-500"
          style={{
            width: wave.size,
            height: wave.size,
            opacity: 0,
            animation: `soundWavePulse ${wave.duration}s ease-out ${wave.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Equalizer() {
  const bars = useMemo(() => {
    const count = 40;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      height: 20 + Math.random() * 60,
      delay: i * 0.05 + Math.random() * 0.3,
      duration: 0.6 + Math.random() * 0.8,
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-[3px] pointer-events-none overflow-hidden px-4">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="w-1.5 rounded-t-sm bg-blue-500"
          style={{
            height: `${bar.height}%`,
            opacity: bar.opacity,
            animation: `equalizerBar ${bar.duration}s ease-in-out ${bar.delay}s infinite alternate`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
      {/* Subtle radial glow from center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Sound waves */}
      <SoundWaves />

      {/* Equalizer at bottom */}
      <Equalizer />

      {/* CSS keyframes injected here to avoid globals.css bloat */}
      <style jsx>{`
        @keyframes soundWavePulse {
          0% {
            transform: scale(0.8);
            opacity: 0.2;
          }
          50% {
            opacity: 0.08;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes equalizerBar {
          0% {
            transform: scaleY(0.3);
          }
          100% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
