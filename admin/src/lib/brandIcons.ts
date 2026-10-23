import React from 'react';

export interface BrandPreset {
  id: string;
  name: string;
  emoji: string;
  category: string;
  svgColor: string;
}

export const BRAND_PRESETS: BrandPreset[] = [
  { id: 'chatgpt', name: 'ChatGPT Plus', emoji: '🤖', category: 'AI Tools', svgColor: '#10a37f' },
  { id: 'gemini', name: 'Gemini AI Pro', emoji: '✨', category: 'AI Tools', svgColor: '#4285f4' },
  { id: 'claude', name: 'Claude AI Pro', emoji: '🧠', category: 'AI Tools', svgColor: '#d97706' },
  { id: 'cursor', name: 'Cursor Pro', emoji: '💻', category: 'Dev Tools', svgColor: '#3b82f6' },
  { id: 'apple-music', name: 'Apple Music', emoji: '🎵', category: 'Music', svgColor: '#fc3c44' },
  { id: 'spotify', name: 'Spotify Premium', emoji: '🎧', category: 'Music', svgColor: '#1ed760' },
  { id: 'netflix', name: 'Netflix 4K UHD', emoji: '🎬', category: 'Streaming', svgColor: '#e50914' },
  { id: 'youtube', name: 'YouTube Premium', emoji: '▶️', category: 'Streaming', svgColor: '#ff0000' },
  { id: 'prime-video', name: 'Prime Video', emoji: '📺', category: 'Streaming', svgColor: '#00a8e1' },
  { id: 'canva', name: 'Canva Pro', emoji: '🎨', category: 'Design', svgColor: '#00c4cc' },
  { id: 'adobe', name: 'Adobe Express / CC', emoji: '🎨', category: 'Design', svgColor: '#ff0000' },
  { id: 'duolingo', name: 'Duolingo Super', emoji: '🦉', category: 'Education', svgColor: '#58cc02' },
  { id: 'telegram', name: 'Telegram Premium', emoji: '⭐', category: 'Social', svgColor: '#24a1de' },
  { id: 'discord', name: 'Discord Nitro', emoji: '👾', category: 'Social', svgColor: '#5865f2' },
  { id: 'vpn', name: 'NordVPN / ExpressVPN', emoji: '🛡️', category: 'Security', svgColor: '#4f46e5' },
  { id: 'tradingview', name: 'TradingView Pro', emoji: '📈', category: 'Finance', svgColor: '#2962ff' },
  { id: 'steam', name: 'Steam Wallet / Game', emoji: '🎮', category: 'Gaming', svgColor: '#1b2838' },
  { id: 'copilot', name: 'GitHub Copilot', emoji: '🐙', category: 'Dev Tools', svgColor: '#a855f7' },
  { id: 'midjourney', name: 'Midjourney AI', emoji: '🖼️', category: 'AI Tools', svgColor: '#ffffff' },
  { id: 'binance', name: 'Binance Pay / Crypto', emoji: '🔸', category: 'Crypto', svgColor: '#f3ba2f' },
];

export const POPULAR_EMOJIS = [
  '✨', '🤖', '💻', '🎵', '🎧', '🎬', '📺', '🎨', '🦉', '⭐',
  '👾', '🛡️', '📈', '🎮', '🐙', '🖼️', '🔸', '💎', '🟣', '🪙',
  '⚡', '🔥', '👑', '🔑', '🚀', '🎁', '📦', '🛒', '💰', '💵'
];
