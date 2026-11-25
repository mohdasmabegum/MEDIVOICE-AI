import React from 'react';
import { Activity, Bot, Mic } from 'lucide-react';

interface SplashScreenProps {
  isVisible: boolean;
  isFadingOut: boolean;
  errorNotice?: string | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible,
  isFadingOut,
  errorNotice,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-gradient-to-br from-white via-[#F8FAFC] to-teal-50/70 flex flex-col items-center justify-center p-6 transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading MediVoice"
    >
      {/* Subtle decorative background accents */}
      <div className="absolute top-12 right-12 w-72 h-72 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-12 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        {/* MediVoice Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
            <Activity className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#172033] text-2xl tracking-tight">MediVoice</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-[#0D9488] border border-teal-200/70">
                AI
              </span>
            </div>
            <p className="text-xs font-medium text-[#64748B]">Your Intelligent Clinic Assistant</p>
          </div>
        </div>

        {/* Alex AI Voice Assistant Visual + Animated Sound Waves */}
        <div className="relative flex items-center justify-center my-2">
          <span className="absolute w-32 h-32 rounded-full border border-teal-300/50 animate-ping opacity-30" />
          <span className="absolute w-28 h-28 rounded-full bg-teal-100/60" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white shadow-elevated ring-4 ring-white">
            <Bot className="w-11 h-11" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-teal-200 shadow-sm flex items-center justify-center text-[#0D9488]">
            <Mic className="w-4 h-4" />
          </div>
        </div>

        {/* Subtle Animated Waveform */}
        <div className="mt-6 flex items-center justify-center gap-1 h-7" aria-hidden="true">
          {[10, 18, 26, 16, 24, 14, 20, 12].map((height, idx) => (
            <span
              key={idx}
              className="w-1 rounded-full bg-[#0D9488]/75 animate-pulse"
              style={{
                height: `${height}px`,
                animationDelay: `${idx * 110}ms`,
                animationDuration: '1.1s',
              }}
            />
          ))}
        </div>

        {/* Tagline & Subtitle */}
        <div className="mt-5 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-xs font-semibold text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
            <span>Alex • AI Voice Assistant</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#172033] pt-1">
            Your Intelligent Clinic Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-sm mx-auto leading-relaxed">
            Making healthcare appointments easier through conversation.
          </p>
        </div>

        {/* Simple Loading Indicator */}
        <div className="mt-8 flex items-center gap-2.5 text-xs font-medium text-[#64748B]">
          <span className="w-4 h-4 rounded-full border-2 border-teal-200 border-t-[#0D9488] animate-spin" />
          <span>{errorNotice || 'Preparing clinic dashboard...'}</span>
        </div>
      </div>
    </div>
  );
};
