import { useEffect } from 'react';

/**
 * Spatial D-Pad Navigation hook for Smart TV remote control.
 * Calculates spatial geometry between focusable elements on Arrow keys (Up, Down, Left, Right)
 * and automatically scrolls focused elements into view.
 */
export function useTVNavigation() {
  useEffect(() => {
    const isFocusable = (el: HTMLElement): boolean => {
      if (!el || el.getAttribute('tabindex') === '-1' || el.hasAttribute('disabled')) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    };

    const getFocusableElements = (): HTMLElement[] => {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]';
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
      return nodes.filter(isFocusable);
    };

    const calculateDistance = (
      currentRect: DOMRect,
      candidateRect: DOMRect,
      direction: 'up' | 'down' | 'left' | 'right'
    ): number | null => {
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };
      const candidateCenter = {
        x: candidateRect.left + candidateRect.width / 2,
        y: candidateRect.top + candidateRect.height / 2,
      };

      const dx = candidateCenter.x - currentCenter.x;
      const dy = candidateCenter.y - currentCenter.y;

      // Check alignment in direction
      if (direction === 'left' && dx >= -5) return null;
      if (direction === 'right' && dx <= 5) return null;
      if (direction === 'up' && dy >= -5) return null;
      if (direction === 'down' && dy <= 5) return null;

      // Primary axis distance and orthogonal weight penalty
      const mainDist = Math.abs(direction === 'left' || direction === 'right' ? dx : dy);
      const crossDist = Math.abs(direction === 'left' || direction === 'right' ? dy : dx);

      return mainDist + crossDist * 2.5;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const directionMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const direction = directionMap[e.key];
      if (!direction) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const candidates = getFocusableElements();

      if (candidates.length === 0) return;

      // If nothing is focused yet or body is focused, focus first element
      if (!activeEl || activeEl === document.body) {
        e.preventDefault();
        candidates[0].focus();
        candidates[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }

      // Special handling: if focus is inside an input field, let ArrowLeft/Right move text cursor unless at boundary
      if (activeEl.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const input = activeEl as HTMLInputElement;
        if (e.key === 'ArrowLeft' && input.selectionStart !== 0) return;
        if (e.key === 'ArrowRight' && input.selectionEnd !== input.value.length) return;
      }

      const activeRect = activeEl.getBoundingClientRect();
      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const candidate of candidates) {
        if (candidate === activeEl || activeEl.contains(candidate)) continue;

        const candidateRect = candidate.getBoundingClientRect();
        const dist = calculateDistance(activeRect, candidateRect, direction);

        if (dist !== null && dist < minDistance) {
          minDistance = dist;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        e.preventDefault();
        bestCandidate.focus();

        // Smoothly scroll focused element into view
        bestCandidate.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
