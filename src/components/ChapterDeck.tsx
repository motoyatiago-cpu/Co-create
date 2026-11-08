import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ChapterField } from './ChapterField';
import { navigation } from '../data/copy';
import '../styles/chapter.css';

export function ChapterDeck({ active, children }: { active: string; children: ReactNode }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, navigation.findIndex(item => item.id === active));

  useLayoutEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    deck.querySelectorAll<HTMLElement>('[data-chapter]').forEach(card => {
      const current = card.id === active;
      card.classList.toggle('is-page-active', current);
      card.classList.toggle('is-active', current);
    });
  }, [active]);

  return <div className="chapter-deck" ref={deckRef}>
    <ChapterField active={activeIndex} />
    <div className="chapter-stage">{children}</div>
  </div>;
}
