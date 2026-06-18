'use client';

import { useEffect, useState, useCallback } from 'react';

const EMOJIS = [
  '🎲', // dice
  '🃏', // joker card
  '⚽', // ball
  '🏀', // basketball
  '🎯', // dart
  '💰', // money bag
  '🎮', // controller
  '🏆', // trophy
  '⚡', // lightning
  '🔥', // fire
  '🎴', // playing card
  '🎰', // slot machine
];

type PassByItem = {
  id: number;
  emoji: string;
  top: number;      // % from viewport top
  size: number;     // rem
  duration: number; // seconds
  delay: number;    // seconds
  dir: 'ltr' | 'rtl';
  spin: number;     // degrees total rotation
};

let uid = 0;

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildWave(): PassByItem[] {
  const count = 2 + Math.floor(Math.random() * 2); // 2 or 3 items
  const usedEmojis: string[] = [];

  return Array.from({ length: count }, (_, i) => {
    // avoid duplicate emoji in same wave
    let emoji = pickRandom(EMOJIS);
    while (usedEmojis.includes(emoji)) emoji = pickRandom(EMOJIS);
    usedEmojis.push(emoji);

    return {
      id: uid++,
      emoji,
      top:      randBetween(12, 78),
      size:     randBetween(2, 3.5),
      duration: randBetween(3.5, 6),
      delay:    i * randBetween(0.5, 1.1),
      dir:      Math.random() > 0.5 ? 'ltr' : 'rtl',
      spin:     randBetween(180, 540) * (Math.random() > 0.5 ? 1 : -1),
    };
  });
}

export function PassByAnimation() {
  const [items, setItems] = useState<PassByItem[]>([]);

  const fireWave = useCallback(() => {
    const wave = buildWave();
    setItems((prev) => [...prev, ...wave]);

    // Remove items after their animations finish
    const ttl = Math.max(...wave.map((w) => (w.delay + w.duration) * 1000)) + 400;
    const ids  = new Set(wave.map((w) => w.id));
    setTimeout(() => setItems((prev) => prev.filter((w) => !ids.has(w.id))), ttl);
  }, []);

  useEffect(() => {
    // First wave fires 2.5s after page load
    const initial  = setTimeout(fireWave, 2500);
    // Then every 60 seconds
    const interval = setInterval(fireWave, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fireWave]);

  if (items.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {items.map((item) => (
        <span
          key={item.id}
          className="dare-passby-item"
          data-dir={item.dir}
          style={{
            '--dare-top':   `${item.top}%`,
            '--dare-size':  `${item.size}rem`,
            '--dare-dur':   `${item.duration}s`,
            '--dare-delay': `${item.delay}s`,
            '--dare-spin':  `${item.spin}deg`,
          } as React.CSSProperties}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
