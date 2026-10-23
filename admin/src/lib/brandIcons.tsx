import React from 'react';

export interface BrandPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  emojiFallback: string;
  svg: string;
}

export const BRAND_SVGS: Record<string, { name: string; color: string; emoji: string; category: string; svg: string }> = {
  chatgpt: {
    name: 'ChatGPT Plus',
    color: '#10a37f',
    emoji: '🤖',
    category: 'AI Tools',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1.5a4 4 0 0 1 3.4 6 4 4 0 0 1-1.4 7.5v.5a4 4 0 0 1-6 3.4 4 4 0 0 1-7.5-1.4H4a4 4 0 0 1-4-4V18a4 4 0 0 1 1.4-3 4 4 0 0 1 2.6-9V5a4 4 0 0 1 8-3z"/><path d="M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/><path d="M15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/><path d="M9 16c1 .8 2 1 3 1s2-.2 3-1"/></svg>`
  },
  netflix: {
    name: 'Netflix 4K UHD',
    color: '#e50914',
    emoji: '🎬',
    category: 'Streaming',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 2h3.2l5.6 15.3V2h3.2v20h-3.2L8.7 6.7V22H5.5V2z"/></svg>`
  },
  spotify: {
    name: 'Spotify Premium',
    color: '#1ed760',
    emoji: '🎧',
    category: 'Music',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.625.625 0 0 1-.861.207c-2.357-1.44-5.326-1.766-8.823-.967a.626.626 0 1 1-.278-1.22c3.827-.874 7.11-.504 9.755 1.118a.625.625 0 0 1 .207.862zm1.226-2.723a.783.783 0 0 1-1.077.258c-2.698-1.658-6.81-2.14-10-1.17a.783.783 0 0 1-.462-1.496c3.645-1.106 8.188-.574 11.28 1.331a.783.783 0 0 1 .26 1.077zm.105-2.836C14.686 8.91 9.36 8.734 6.273 9.67a.939.939 0 0 1-.552-1.794c3.553-1.078 9.43-.873 13.16 1.343a.94.94 0 0 1-.963 1.646z"/></svg>`
  },
  youtube: {
    name: 'YouTube Premium',
    color: '#ff0000',
    emoji: '▶️',
    category: 'Streaming',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
  },
  telegram: {
    name: 'Telegram Premium',
    color: '#24a1de',
    emoji: '⭐',
    category: 'Social',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>`
  },
  discord: {
    name: 'Discord Nitro',
    color: '#5865f2',
    emoji: '👾',
    category: 'Social',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
  },
  binance: {
    name: 'Binance Pay',
    color: '#f3ba2f',
    emoji: '🔸',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.624 13.92l2.715 2.715-7.34 7.34-7.34-7.34 2.715-2.716 4.625 4.625 4.626-4.625zm4.66-4.66l2.716 2.716-2.716 2.715-2.715-2.715 2.715-2.716zm-9.285-9.26l7.34 7.34-2.715 2.716-4.625-4.625-4.625 4.625-2.716-2.716 7.341-7.34zm-9.284 9.26l2.715 2.716-2.715 2.715-2.716-2.715 2.716-2.716zm9.284 1.839l2.798 2.798-2.798 2.798-2.798-2.798 2.798-2.798z"/></svg>`
  },
  bybit: {
    name: 'Bybit Pay',
    color: '#f7a600',
    emoji: '💎',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2L6 8.5v7l7.5 6.5 7.5-6.5v-7L13.5 2zm-1.5 3.5l4.5 3.9-4.5 3.9-4.5-3.9 4.5-3.9zm-4.5 6.2l3.8 3.3-3.8 3.3v-6.6zm6 6.6l4.5-3.9v3.9l-4.5 3.3v-3.3z"/></svg>`
  },
  usdt: {
    name: 'USDT (Tether)',
    color: '#26a17b',
    emoji: '🟢',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.2 4.4h4.4v2.5h-4.4V10c2.5.1 4.7.7 4.7 1.4s-2.2 1.3-4.7 1.4v4.8h-2.4v-4.8c-2.5-.1-4.7-.7-4.7-1.4s2.2-1.3 4.7-1.4V8.9H6.4V6.4h6.8V6.4z"/></svg>`
  },
  canva: {
    name: 'Canva Pro',
    color: '#00c4cc',
    emoji: '🎨',
    category: 'Design',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm4.18 13.91a4.93 4.93 0 0 1-4.18 1.77 5.74 5.74 0 0 1-5.73-5.73 5.74 5.74 0 0 1 5.73-5.73 4.88 4.88 0 0 1 3.93 1.62l-1.5 1.5a2.76 2.76 0 0 0-2.43-1 3.6 3.6 0 0 0-3.6 3.6 3.6 3.6 0 0 0 3.6 3.6 3.1 3.1 0 0 0 2.58-1.22z"/></svg>`
  },
  apple: {
    name: 'Apple Services',
    color: '#fc3c44',
    emoji: '🎵',
    category: 'Music',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.37c.63-.78 1.06-1.85.94-2.94-.93.04-2.02.63-2.67 1.4-.58.68-1.09 1.77-.96 2.84 1.04.08 2.07-.53 2.69-1.3z"/></svg>`
  },
  cursor: {
    name: 'Cursor AI Pro',
    color: '#3b82f6',
    emoji: '💻',
    category: 'Dev Tools',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
  },
  prime: {
    name: 'Prime Video',
    color: '#00a8e1',
    emoji: '📺',
    category: 'Streaming',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>`
  },
  gemini: {
    name: 'Gemini AI Pro',
    color: '#4285f4',
    emoji: '✨',
    category: 'AI Tools',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/></svg>`
  },
  claude: {
    name: 'Claude AI',
    color: '#d97706',
    emoji: '🧠',
    category: 'AI Tools',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M7.76 16.24l-2.83 2.83m14.14 0l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>`
  },
  vpn: {
    name: 'VPN Services',
    color: '#4f46e5',
    emoji: '🛡️',
    category: 'Security',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
  },
  tradingview: {
    name: 'TradingView Pro',
    color: '#2962ff',
    emoji: '📈',
    category: 'Finance',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`
  },
  ton: {
    name: 'TON Network',
    color: '#0098ea',
    emoji: '💎',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 8v8l9 6 9-6V8l-9-6zm0 3.3L18.4 9 12 12.7 5.6 9 12 5.3zm-6.6 5l5.6 3.2v6.2l-5.6-3.7V10.3zm7.6 9.4v-6.2l5.6-3.2v5.7l-5.6 3.7z"/></svg>`
  },
  ltc: {
    name: 'Litecoin (LTC)',
    color: '#345d9d',
    emoji: 'Ł',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.6 15.6H7.8l1.4-5.3-2 .5.4-1.5 2-.5 1.5-5.6h2.7l-1.3 5 2.1-.5-.4 1.5-2.1.5-1.1 4.1h3.9l-.6 1.8z"/></svg>`
  },
  polygon: {
    name: 'Polygon (MATIC)',
    color: '#8247e5',
    emoji: '🟣',
    category: 'Crypto',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 7.5L12 4.9 7.5 7.5v5.2l4.5 2.6 4.5-2.6V7.5zm-4.5 1.7l2.3 1.3v2.6l-2.3 1.3-2.3-1.3v-2.6l2.3-1.3z"/></svg>`
  }
};

export const BRAND_PRESETS: BrandPreset[] = Object.entries(BRAND_SVGS).map(([id, item]) => ({
  id,
  name: item.name,
  category: item.category,
  color: item.color,
  emojiFallback: item.emoji,
  svg: item.svg
}));

/**
 * Universal BrandIcon Component
 * Renders raw SVG, Brand Preset ID, Image URL, or Emoji gracefully
 */
export const BrandIcon: React.FC<{
  icon?: string;
  className?: string;
  size?: number;
  fallbackColor?: string;
}> = ({ icon = '✨', className = 'w-5 h-5', size, fallbackColor }) => {
  if (!icon) {
    return <span className={className}>✨</span>;
  }

  const clean = icon.trim();

  // 1. Raw SVG String
  if (clean.startsWith('<svg')) {
    return (
      <div 
        className={`inline-flex items-center justify-center shrink-0 ${className}`} 
        style={size ? { width: size, height: size } : undefined}
        dangerouslySetInnerHTML={{ __html: clean }} 
      />
    );
  }

  // 2. Preset Key Match (e.g. 'netflix', 'chatgpt', 'spotify')
  const lower = clean.toLowerCase();
  const presetKey = Object.keys(BRAND_SVGS).find(
    (k) => lower === k || lower.includes(k)
  );

  if (presetKey && BRAND_SVGS[presetKey]) {
    const item = BRAND_SVGS[presetKey];
    return (
      <div 
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ color: item.color, ...(size ? { width: size, height: size } : {}) }}
        dangerouslySetInnerHTML={{ __html: item.svg }}
      />
    );
  }

  // 3. Image URL or Data URL
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image')) {
    return (
      <img 
        src={clean} 
        alt="icon" 
        className={`object-contain rounded shrink-0 ${className}`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  // 4. Emoji or Character Fallback
  return (
    <span 
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={fallbackColor ? { color: fallbackColor } : undefined}
    >
      {clean}
    </span>
  );
};

/**
 * Resolves any icon (preset ID, raw SVG, URL, or emoji) to a clean, crisp Telegram button emoji
 */
export function resolveTelegramButtonEmoji(icon?: string, fallbackName?: string): string {
  if (!icon && !fallbackName) return '✨';
  const clean = String(icon || '').trim();

  // 1. Direct Emoji Check (single emoji character or unicode symbol)
  if (clean && !clean.startsWith('<') && !clean.startsWith('http')) {
    const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (BRAND_SVGS[lower]) {
      return BRAND_SVGS[lower].emoji;
    }
    const matchedKey = Object.keys(BRAND_SVGS).find(k => lower === k || lower.includes(k));
    if (matchedKey && BRAND_SVGS[matchedKey]) {
      return BRAND_SVGS[matchedKey].emoji;
    }
    // Check if it's already an emoji
    try {
      const emojiMatch = clean.match(new RegExp('(\\p{Emoji_Presentation}|\\p{Extended_Pictographic})', 'u'));
      if (emojiMatch) {
        return emojiMatch[0];
      }
    } catch {
      // fallback
    }
    if (clean.length <= 2) {
      return clean;
    }
  }

  // 2. Raw SVG parsing
  if (clean.startsWith('<svg') || clean.includes('<path')) {
    const lowerSvg = clean.toLowerCase();
    for (const [key, item] of Object.entries(BRAND_SVGS)) {
      if (lowerSvg.includes(key)) {
        return item.emoji;
      }
    }
  }

  // 3. Fallback to product/gateway title
  if (fallbackName) {
    const lowerName = String(fallbackName).toLowerCase();
    for (const [key, item] of Object.entries(BRAND_SVGS)) {
      if (lowerName.includes(key)) {
        return item.emoji;
      }
    }
  }

  return clean && clean.length <= 4 ? clean : '✨';
}
