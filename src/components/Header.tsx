import { ConnectKitButton } from 'connectkit';
import { MapPin } from 'lucide-react';

interface HeaderProps {
  mode: 'passenger' | 'driver';
  onModeChange: (mode: 'passenger' | 'driver') => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <MapPin className="size-4 text-white" />
          </div>
          <span
            className="display text-lg font-bold"
            style={{ color: 'var(--ink)' }}
          >
            ArcRoute
          </span>
        </div>

        {/* Mode toggle */}
        <div
          className="flex items-center gap-1 rounded-2xl p-1"
          style={{ background: 'var(--surface-muted)' }}
        >
          <button
            onClick={() => onModeChange('passenger')}
            className="rounded-xl px-4 py-1.5 text-sm font-semibold transition-all"
            style={{
              background: mode === 'passenger' ? 'var(--accent)' : 'transparent',
              color: mode === 'passenger' ? '#ffffff' : 'var(--muted)',
            }}
          >
            Find a Ride
          </button>
          <button
            onClick={() => onModeChange('driver')}
            className="rounded-xl px-4 py-1.5 text-sm font-semibold transition-all"
            style={{
              background: mode === 'driver' ? 'var(--accent)' : 'transparent',
              color: mode === 'driver' ? '#ffffff' : 'var(--muted)',
            }}
          >
            Offer a Ride
          </button>
        </div>

        {/* Wallet */}
        <ConnectKitButton />
      </div>
    </header>
  );
}
