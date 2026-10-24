import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { convertSrtToVtt, normalizeVtt, elevateVttPosition, useWatchMovie } from './useWatchMovie';

describe('normalizeVtt', () => {
    it('normalizes VSMOV malformed .vtt payloads with WEBVTT header and SRT comma timestamps', () => {
        const vsmovMalformed = `WEBVTT\n\n1\n00:01:30,780 --> 00:01:34,371\n=Thượng Công Chúa=\n\n2\n00:01:35,100 --> 00:01:38,920\nXin bệ hạ bớt giận.`;

        const vtt = normalizeVtt(vsmovMalformed);

        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).toContain('00:01:30.780 --> 00:01:34.371 line:82%');
        expect(vtt).toContain('=Thượng Công Chúa=');
        expect(vtt).toContain('00:01:35.100 --> 00:01:38.920 line:82%');
        expect(vtt).toContain('Xin bệ hạ bớt giận.');
        expect(vtt).not.toContain('00:01:30,780');
        expect(vtt).not.toContain('00:01:34,371');
    });

    it('preserves valid WebVTT with dot timestamps in both MM:SS.mmm and HH:MM:SS.mmm formats', () => {
        const validVtt = `WEBVTT

01:15.250 --> 01:18.500
Dòng phụ đề ngắn (MM:SS.mmm)

01:02:03.400 --> 01:02:06.800
Dòng phụ đề dài (HH:MM:SS.mmm)`;

        const vtt = normalizeVtt(validVtt);

        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).toContain('01:15.250 --> 01:18.500 line:82%');
        expect(vtt).toContain('01:02:03.400 --> 01:02:06.800 line:82%');
        expect(vtt).toContain('Dòng phụ đề ngắn (MM:SS.mmm)');
        expect(vtt).toContain('Dòng phụ đề dài (HH:MM:SS.mmm)');
    });

    it('is idempotent and never duplicates WEBVTT or line:82%', () => {
        const raw = `WEBVTT\n\n1\n00:01:30,780 --> 00:01:34,371\n=Thượng Công Chúa=`;

        const once = normalizeVtt(raw);
        const twice = normalizeVtt(once);

        expect(twice).toBe(once);
        expect(twice.match(/WEBVTT/g)?.length).toBe(1);
        expect(twice.match(/line:82%/g)?.length).toBe(1);
    });

    it('replaces existing line: cue settings cleanly without duplicating line:82%', () => {
        const withSettings = `WEBVTT\n\n00:00:10.000 --> 00:00:12.500 align:center line:90% size:80%\nPhụ đề có sẵn line`;

        const vtt = normalizeVtt(withSettings);

        expect(vtt).toContain('00:00:10.000 --> 00:00:12.500 align:center line:82% size:80%');
        expect(vtt.match(/line:/g)?.length).toBe(1);
        expect(elevateVttPosition(vtt)).toBe(vtt);
    });

    it('strips leading UTF-8 BOM and normalizes CRLF and CR line endings', () => {
        const bomCrlf = '\uFEFFWEBVTT\r\n\r\n1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa=\r00:01:35,000 --> 00:01:37,000\rDòng hai\r\n';

        const vtt = normalizeVtt(bomCrlf);

        expect(vtt.charCodeAt(0)).not.toBe(0xfeff);
        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).not.toContain('\r');
        expect(vtt).toContain('00:01:30.780 --> 00:01:34.371 line:82%');
        expect(vtt).toContain('00:01:35.000 --> 00:01:37.000 line:82%');
    });

    it('ensures a blank line after WEBVTT header when missing before the first cue', () => {
        const missingBlankWithCueId = `WEBVTT\n1\n00:01:30,780 --> 00:01:34,371\n=Thượng Công Chúa=`;
        const missingBlankNoCueId = `WEBVTT\n00:01:30,780 --> 00:01:34,371\n=Thượng Công Chúa=`;

        expect(normalizeVtt(missingBlankWithCueId)).toBe(
            `WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371 line:82%\n=Thượng Công Chúa=`
        );
        expect(normalizeVtt(missingBlankNoCueId)).toBe(
            `WEBVTT\n\n00:01:30.780 --> 00:01:34.371 line:82%\n=Thượng Công Chúa=`
        );
    });

    it('does not alter comma-separated numbers inside subtitle dialogue lines', () => {
        const dialogueWithTimeComma = `WEBVTT\n\n1\n00:02:00,100 --> 00:02:03,400\nLúc 10:30,500 kỵ binh đã tới.`;

        const vtt = normalizeVtt(dialogueWithTimeComma);

        expect(vtt).toContain('00:02:00.100 --> 00:02:03.400 line:82%');
        expect(vtt).toContain('Lúc 10:30,500 kỵ binh đã tới.');
    });
});

describe('convertSrtToVtt', () => {
    it('converts standard SRT timestamps and formatting to WebVTT', () => {
        const srt = `1
00:00:01,000 --> 00:00:04,500
Xin chào thế giới!

2
00:00:05,200 --> 00:00:08,750
Đây là phụ đề tiếng Việt.`;

        const vtt = convertSrtToVtt(srt);

        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).toContain('00:00:01.000 --> 00:00:04.500 line:82%');
        expect(vtt).toContain('Xin chào thế giới!');
        expect(vtt).toContain('00:00:05.200 --> 00:00:08.750 line:82%');
        expect(vtt).toContain('Đây là phụ đề tiếng Việt.');
        expect(vtt).not.toContain('00:00:01,000');
    });

    it('handles UTF-8 BOM and Windows CRLF line endings correctly', () => {
        const srt = "\uFEFF1\r\n00:01:10,123 --> 00:01:15,456\r\nHello world\r\n";
        const vtt = convertSrtToVtt(srt);
        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).toContain('00:01:10.123 --> 00:01:15.456 line:82%');
        expect(vtt).toContain('Hello world');
    });
});

describe('useWatchMovie subtitle track loading', () => {
    const createdBlobs: Blob[] = [];
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        createdBlobs.length = 0;
        const store = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, String(v)); },
            removeItem: (k: string) => { store.delete(k); },
            clear: () => { store.clear(); },
        });
        URL.createObjectURL = vi.fn((obj: Blob | MediaSource) => {
            if (obj instanceof Blob) createdBlobs.push(obj);
            return `blob:mock-${createdBlobs.length}`;
        });
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('falls back to /api/stream/vtt when direct VTT fetch fails, normalizes comma timestamps, sets default on vi, and disambiguates duplicate srclangs', async () => {
        const malformedVsmovVtt = `WEBVTT\n\n1\n00:01:30,780 --> 00:01:34,371\n=Thượng Công Chúa=`;
        const videoEl = document.createElement('video');
        vi.spyOn(videoEl, 'play').mockResolvedValue();

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/videos/thuong-cong-chua') {
                return new Response(JSON.stringify({
                    id: '1',
                    title: 'Thượng Công Chúa',
                    slug: 'thuong-cong-chua',
                    description: 'Test',
                    thumbnail: '',
                    category: 'series',
                    episodes: [
                        {
                            number: 1,
                            title: 'Tập 1',
                            url: 'https://cdn.example.com/ep1.m3u8',
                            serverName: 'VSMOV',
                            subtitles: [
                                { label: 'Vietnamese', lang: 'vi', url: 'https://sub.vsmov.example/vie_1.vtt' },
                                { label: 'Vietnamese (Backup)', lang: 'vi', url: 'https://sub.vsmov.example/vie_2.vtt' },
                                { label: 'English', lang: 'en', url: 'https://sub.vsmov.example/eng_1.vtt' },
                            ],
                        },
                    ],
                }), { status: 200 });
            }
            if (url.startsWith('/api/stream?url=')) {
                return new Response('#EXTM3U\n#EXT-X-VERSION:3\n', { status: 200 });
            }
            if (url.startsWith('https://sub.vsmov.example/')) {
                throw new TypeError('CORS blocked');
            }
            if (url.startsWith('/api/stream/vtt?url=')) {
                return new Response(malformedVsmovVtt, { status: 200 });
            }
            return new Response('', { status: 404 });
        });
        vi.stubGlobal('fetch', fetchMock);

        const { result, unmount } = renderHook(() => {
            const hook = useWatchMovie('thuong-cong-chua', '1', 'VSMOV');
            hook.videoRef.current = videoEl;
            return hook;
        });

        await waitFor(() => {
            expect(result.current.subtitles.length).toBe(3);
        });

        const trackEls = Array.from(videoEl.querySelectorAll('track'));
        expect(trackEls).toHaveLength(3);
        expect(trackEls.map(t => t.srclang)).toEqual(['vi', 'vi-2', 'en']);
        expect(trackEls[0].default).toBe(true);
        expect(trackEls[2].default).toBe(false);
        expect(createdBlobs.length).toBe(3);

        const blobText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(createdBlobs[0]);
        });
        expect(blobText).toContain('00:01:30.780 --> 00:01:34.371 line:82%');
        expect(blobText).toContain('=Thượng Công Chúa=');
        unmount();
    });

    it('assigns distinct custom srclang values and normalizes both .srt and .vtt custom uploads', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
        const videoEl = document.createElement('video');

        const { result, unmount } = renderHook(() => {
            const hook = useWatchMovie(undefined, '1');
            hook.videoRef.current = videoEl;
            return hook;
        });

        const createSubtitleFile = (name: string, content: string): File => {
            const file = new File([content], name, { type: 'text/plain' });
            if (typeof file.text !== 'function') {
                Object.defineProperty(file, 'text', {
                    value: () => Promise.resolve(content),
                });
            }
            return file;
        };

        const srtFile = createSubtitleFile('sub1.srt', '1\n00:00:02,500 --> 00:00:05,000\nXin chào');
        const vttFile = createSubtitleFile('sub2.vtt', 'WEBVTT\n\n1\n00:00:06,100 --> 00:00:08,200\nTạm biệt');

        await act(async () => {
            expect(await result.current.loadCustomSubtitle(srtFile)).toBe(true);
            expect(await result.current.loadCustomSubtitle(vttFile)).toBe(true);
        });

        const trackEls = Array.from(videoEl.querySelectorAll('track'));
        expect(trackEls).toHaveLength(2);
        expect(trackEls[0].srclang).toMatch(/^custom-\d+$/);
        expect(trackEls[1].srclang).toMatch(/^custom-\d+$/);
        expect(trackEls[0].srclang).not.toBe(trackEls[1].srclang);
        unmount();
    });
});
