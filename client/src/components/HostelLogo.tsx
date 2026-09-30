interface HostelLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function HostelLogo({ className = '', size = 'md', showText = false }: HostelLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-2xl font-bold',
    xl: 'text-3xl font-extrabold',
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Standalone Brand Logo Mark — pure vector, NO background square / box */}
      <div
        className={`${iconSizes[size]} shrink-0 flex items-center justify-center select-none`}
        aria-label="Hostel Management Logo"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
        >
          <defs>
            <linearGradient id="hostelRoofGrad" x1="2" y1="2" x2="30" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A5B4FC" />
              <stop offset="0.5" stopColor="#818CF8" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="hostelPillarGrad" x1="4" y1="12" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="0.6" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="hostelArchGrad" x1="10" y1="16" x2="22" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818CF8" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>

            {/* Mask to carve the doorway out of the center arch so the background shines through */}
            <mask id="doorwayCutout">
              <rect x="0" y="0" width="32" height="32" fill="#FFFFFF" />
              <path d="M13.5 30V24.5C13.5 23.1 14.6 22 16 22C17.4 22 18.5 23.1 18.5 24.5V30H13.5Z" fill="#000000" />
            </mask>
          </defs>

          {/* Roof Crest / Modern Pavilion Canopy */}
          <path
            d="M16 2L2 12.8L4 15L16 5.8L28 15L30 12.8L16 2Z"
            fill="url(#hostelRoofGrad)"
          />

          {/* Group with doorway mask for seamless transparent arch */}
          <g mask="url(#doorwayCutout)">
            {/* Left Tower / 'H' Left Pillar */}
            <rect x="5" y="13.5" width="5" height="15.5" rx="1.5" fill="url(#hostelPillarGrad)" />

            {/* Right Tower / 'H' Right Pillar */}
            <rect x="22" y="13.5" width="5" height="15.5" rx="1.5" fill="url(#hostelPillarGrad)" />

            {/* Connecting Bridge & Vaulted Archway */}
            <path
              d="M10 17H22V22.5C22 25.8 19.3 29 16 29C12.7 29 10 25.8 10 22.5V17Z"
              fill="url(#hostelArchGrad)"
            />
          </g>

          {/* Modern Illuminated Windows */}
          <rect x="6.5" y="16" width="2" height="2" rx="0.5" fill="#FFFFFF" fillOpacity="0.9" />
          <rect x="6.5" y="20.5" width="2" height="2" rx="0.5" fill="#FFFFFF" fillOpacity="0.9" />
          <rect x="6.5" y="25" width="2" height="2" rx="0.5" fill="#C7D2FE" fillOpacity="0.8" />

          <rect x="23.5" y="16" width="2" height="2" rx="0.5" fill="#FFFFFF" fillOpacity="0.9" />
          <rect x="23.5" y="20.5" width="2" height="2" rx="0.5" fill="#FFFFFF" fillOpacity="0.9" />
          <rect x="23.5" y="25" width="2" height="2" rx="0.5" fill="#C7D2FE" fillOpacity="0.8" />

          {/* Glowing Beacon above Gateway */}
          <circle cx="16" cy="18" r="1.3" fill="#FBBF24" />
        </svg>
      </div>

      {showText && (
        <span className={`tracking-tight text-white ${textSizes[size]}`}>
          Hostel Management
        </span>
      )}
    </div>
  );
}
