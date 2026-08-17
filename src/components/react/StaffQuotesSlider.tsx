import React, { useState, useEffect, useRef } from 'react';

export interface StaffQuoteItem {
  _id?: string;
  name: string;
  title?: string;
  quote: string;
  photo?: string | null;
}

export interface StaffQuotesSliderProps {
  quotes?: StaffQuoteItem[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

const DEFAULT_FALLBACK_QUOTES: StaffQuoteItem[] = [
  {
    _id: 'default-1',
    name: "Dr. Subba Rao",
    title: "Principal, PSGIMSR",
    quote: "This is a wonderful initiative to bring the faculty and students together to exchange thoughts, ideas and talent. It's a refreshing glass of lemonade at the end of a hot day!",
    photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600"
  },
  {
    _id: 'default-2',
    name: "Dr. T.M. SubbaRao",
    title: "Staff Advisor, Literature Club",
    quote: "Literature and arts remind us of the humanity at the core of medicine. The Suture gives our young healers a platform to express their deepest reflections.",
    photo: null
  }
];

function getInitials(name: string): string {
  if (!name) return 'LC';
  const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StaffQuotesSlider({
  quotes = [],
  autoPlay = true,
  interval = 5500,
  className = ''
}: StaffQuotesSliderProps) {
  // Use CMS quotes if provided and non-empty, otherwise use fallback dataset
  const activeQuotes: StaffQuoteItem[] = (Array.isArray(quotes) && quotes.length > 0) ? quotes : DEFAULT_FALLBACK_QUOTES;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  const activeQuote = activeQuotes[currentIndex] || activeQuotes[0];

  // Auto-slide scroll effect
  useEffect(() => {
    if (!autoPlay || isHovered || activeQuotes.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, interval);
    return () => clearInterval(timer);
  }, [currentIndex, isHovered, autoPlay, interval, activeQuotes.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeQuotes.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeQuotes.length) % activeQuotes.length);
  };

  const handleImageError = (index: number) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const hasValidPhoto = Boolean(activeQuote.photo) && !failedImages[currentIndex];
  const initials = getInitials(activeQuote.name);

  return (
    <div 
      className={`staff-slider ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Staff Quotes Auto Slider"
    >
      {/* HeroUI Horizontal Portrait Card Container */}
      <div className={`staff-card ${hasValidPhoto ? 'staff-card--with-photo' : 'staff-card--fallback'}`}>
        
        {/* Animated Progress Line for Auto-Scrolling */}
        {autoPlay && activeQuotes.length > 1 && (
          <div className="staff-card__progress-track" aria-hidden="true">
            <div 
              className={`staff-card__progress-bar ${isHovered ? 'staff-card__progress-bar--paused' : ''}`} 
              key={`${currentIndex}-${isHovered}`}
              style={{ animationDuration: `${interval}ms` }}
            />
          </div>
        )}

        <div className="staff-card__body">

          {/* LEFT COLUMN: Portrait Photo / Fallback Card (25% - 30% Width) */}
          <div className="staff-card__photo-col">
            <div className={`staff-portrait ${hasValidPhoto ? 'staff-portrait--has-img' : 'staff-portrait--fallback'}`}>
              {hasValidPhoto && activeQuote.photo ? (
                <img
                  src={activeQuote.photo}
                  alt={activeQuote.name}
                  className="staff-portrait__img"
                  onError={() => handleImageError(currentIndex)}
                  loading="lazy"
                />
              ) : (
                <div className="staff-portrait__fallback" title={activeQuote.name}>
                  <div className="staff-portrait__fallback-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="staff-portrait__initials">{initials}</span>
                </div>
              )}
              <div className="staff-portrait__glow" aria-hidden="true" />
            </div>
          </div>

          {/* RIGHT COLUMN: Quote, Author Meta & Controls (70% - 75% Width) */}
          <div className="staff-card__main-col">
            
            {/* Header: Quote Icon */}
            <div className="staff-card__top">
              <div className="staff-card__quote-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 11H6C4.89543 11 4 10.1046 4 9V7C4 5.89543 4.89543 5 6 5H8C9.10457 5 10 5.89543 10 7V11ZM10 11C10 13.7614 7.76142 16 5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 11H16C14.8954 11 14 10.1046 14 9V7C14 5.89543 14.8954 5 16 5H18C19.1046 5 20 5.89543 20 7V11ZM20 11C20 13.7614 17.7614 16 15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Main Quote Content */}
            <div className="staff-card__content">
              <blockquote className="staff-card__quote" key={currentIndex}>
                "{activeQuote.quote}"
              </blockquote>
            </div>

            {/* Footer: Author Info & Controls */}
            <div className="staff-card__footer">
              <div className="staff-card__meta">
                <cite className="staff-card__name">{activeQuote.name}</cite>
                {activeQuote.title && activeQuote.title.trim() !== '' && activeQuote.title.trim().toLowerCase() !== activeQuote.name.trim().toLowerCase() && (
                  <span className="staff-card__title">{activeQuote.title}</span>
                )}
              </div>

              {activeQuotes.length > 1 && (
                <div className="staff-card__nav-btns">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="staff-card__nav-btn"
                    aria-label="Previous quote"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="staff-card__nav-btn"
                    aria-label="Next quote"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Pagination Dots at bottom */}
        {activeQuotes.length > 1 && (
          <div className="staff-card__dots" role="tablist">
            {activeQuotes.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                className={`staff-card__dot ${idx === currentIndex ? 'staff-card__dot--active' : ''}`}
              />
            ))}
          </div>
        )}

      </div>

      <style>{`
        .staff-slider {
          width: 100%;
          max-width: 720px;
          margin-block: var(--space-6, 1.5rem);
        }

        .staff-card {
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1.5rem;
          padding: 1.5rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transition: border-color 200ms ease, box-shadow 200ms ease;
          overflow: hidden;
        }

        .staff-card:hover {
          border-color: rgba(255, 255, 255, 0.24);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        /* Auto-scroll progress line */
        .staff-card__progress-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .staff-card__progress-bar {
          height: 100%;
          background: var(--color-accent, #C1121F);
          width: 0%;
          animation: staffProgressFill linear forwards;
        }

        .staff-card__progress-bar--paused {
          animation-play-state: paused;
        }

        @keyframes staffProgressFill {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Horizontal Layout: Photo (28%-30%) + Main Content (70%-72%) */
        .staff-card__body {
          display: flex;
          gap: 1.5rem;
          align-items: stretch;
        }

        /* Portrait Photo Column (30% - 32% Width) */
        .staff-card__photo-col {
          width: 32%;
          min-width: 175px;
          max-width: 220px;
          flex-shrink: 0;
          display: flex;
        }

        .staff-portrait {
          position: relative;
          width: 100%;
          min-height: 220px;
          height: 100%;
          border-radius: 1.25rem;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .staff-portrait__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }

        .staff-portrait__fallback {
          width: 100%;
          height: 100%;
          min-height: 190px;
          background: linear-gradient(145deg, rgba(193, 18, 31, 0.88) 0%, rgba(90, 8, 15, 0.95) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 1rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .staff-portrait__fallback-badge {
          color: rgba(250, 250, 248, 0.8);
          background: rgba(255, 255, 255, 0.12);
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .staff-portrait__initials {
          font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);
          font-size: 1.6rem;
          font-weight: 700;
          color: #FAFAF8;
          letter-spacing: 0.05em;
        }

        .staff-portrait__glow {
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.25);
          pointer-events: none;
        }

        /* Right Content Column (70% - 72% Width) */
        .staff-card__main-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-block: 0.25rem;
        }

        .staff-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .staff-card__quote-icon {
          color: var(--color-accent, #C1121F);
          opacity: 0.85;
          filter: drop-shadow(0 2px 8px rgba(193, 18, 31, 0.4));
        }

        .staff-card__counter {
          font-size: 0.85rem;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          color: rgba(250, 250, 248, 0.5);
          letter-spacing: 0.05em;
        }

        .staff-card__counter-current {
          color: var(--color-accent, #C1121F);
        }

        .staff-card__counter-sep {
          margin-inline: 0.15rem;
          opacity: 0.4;
        }

        .staff-card__content {
          margin-bottom: 1.15rem;
          min-height: 76px;
          display: flex;
          align-items: center;
        }

        .staff-card__quote {
          font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);
          font-size: 1.05rem;
          line-height: 1.6;
          font-style: italic;
          color: rgba(250, 250, 248, 0.96);
          margin: 0;
          animation: staffQuoteFadeIn 380ms ease-out;
        }

        @keyframes staffQuoteFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .staff-card__footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .staff-card__meta {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }

        .staff-card__name {
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 1rem;
          font-weight: 600;
          font-style: normal;
          color: #FAFAF8;
          letter-spacing: -0.01em;
        }

        .staff-card__title {
          font-size: 0.825rem;
          color: rgba(250, 250, 248, 0.65);
          line-height: 1.35;
        }

        .staff-card__nav-btns {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
        }

        .staff-card__nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(250, 250, 248, 0.85);
          cursor: pointer;
          transition: all 150ms ease;
        }

        .staff-card__nav-btn:hover {
          background: rgba(255, 255, 255, 0.22);
          color: #FAFAF8;
          border-color: rgba(255, 255, 255, 0.35);
          transform: scale(1.06);
        }

        .staff-card__nav-btn:active {
          transform: scale(0.94);
        }

        .staff-card__dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1rem;
        }

        .staff-card__dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.25);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .staff-card__dot--active {
          width: 24px;
          background: var(--color-accent, #C1121F);
        }

        /* Mobile Layout Optimization */
        @media (max-width: 640px) {
          .staff-card {
            padding: 1.15rem;
          }
          .staff-card__body {
            flex-direction: row;
            gap: 0.85rem;
            align-items: flex-start;
          }
          .staff-card__photo-col {
            width: 100px;
            min-width: 100px;
            max-width: 100px;
          }
          .staff-portrait {
            width: 100px;
            height: 130px;
            min-height: 130px;
            aspect-ratio: 3 / 4;
            border-radius: 0.875rem;
          }
          .staff-portrait__img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
          }
          .staff-portrait__fallback {
            min-height: 130px;
            padding: 0.5rem;
            gap: 0.35rem;
          }
          .staff-portrait__initials {
            font-size: 1.3rem;
          }
          .staff-card__content {
            min-height: auto;
            margin-bottom: 0.65rem;
          }
          .staff-card__quote {
            font-size: 0.925rem;
            line-height: 1.5;
          }
          .staff-card__footer {
            padding-top: 0.65rem;
            gap: 0.5rem;
          }
          .staff-card__name {
            font-size: 0.9rem;
          }
          .staff-card__title {
            font-size: 0.75rem;
          }
          .staff-card__nav-btn {
            width: 30px;
            height: 30px;
          }
        }

        @media (max-width: 440px) {
          .staff-card__photo-col {
            width: 84px;
            min-width: 84px;
            max-width: 84px;
          }
          .staff-portrait {
            width: 84px;
            height: 112px;
            min-height: 112px;
          }
          .staff-portrait__initials {
            font-size: 1.15rem;
          }
        }
      `}</style>
    </div>
  );
}
