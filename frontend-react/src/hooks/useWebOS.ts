import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    PalmSystem?: {
      stageReady?: () => void;
      activate?: () => void;
      deactivate?: () => void;
      platformBack?: () => void;
    };
    webOS?: {
      platformBack?: () => void;
      deviceInfo?: (callback: (info: Record<string, unknown>) => void) => void;
    };
  }
}

// Key codes used by LG webOS TV Remote
export const WEBOS_KEY_CODES = {
  BACK: 461,
  BACKSPACE: 8,
  ESCAPE: 27,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  PLAY: 415,
  PAUSE: 19,
  PLAY_PAUSE: 10252,
  STOP: 413,
  FAST_FORWARD: 417,
  REWIND: 412,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
};

type BackHandler = () => boolean | void;
const backHandlers: BackHandler[] = [];

/**
  Register a custom handler for webOS Back key.
  Return `true` in the callback if the event was consumed and should NOT navigate back further.
 */
export function registerWebOSBackHandler(handler: BackHandler) {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) backHandlers.splice(idx, 1);
  };
}

export function useWebOS() {
  const navigate = useNavigate();

  useEffect(() => {
    // Notify LG webOS TV OS that application stage is loaded & ready
    if (typeof window !== 'undefined' && window.PalmSystem?.stageReady) {
      try {
        window.PalmSystem.stageReady();
      } catch (err) {
        console.warn('PalmSystem.stageReady call failed:', err);
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isBackKey =
        e.keyCode === WEBOS_KEY_CODES.BACK ||
        e.key === 'GoBack' ||
        e.key === 'Back' ||
        e.key === 'XF86Back';

      if (isBackKey) {
        e.preventDefault();
        e.stopPropagation();

        // Check registered back handlers in reverse order (top modal/overlay first)
        for (let i = backHandlers.length - 1; i >= 0; i--) {
          const handled = backHandlers[i]();
          if (handled !== false) {
            return;
          }
        }

        // Default back behavior
        if (window.history.length > 1) {
          navigate(-1);
        } else if (window.PalmSystem?.platformBack) {
          window.PalmSystem.platformBack();
        } else if (window.webOS?.platformBack) {
          window.webOS.platformBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [navigate]);
}
