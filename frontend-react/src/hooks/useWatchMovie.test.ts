import { describe, it, expect } from 'vitest';
import { convertSrtToVtt } from './useWatchMovie';

describe('convertSrtToVtt', () => {
    it('converts standard SRT timestamps and formatting to WebVTT', () => {
        const srt = `1
00:00:01,000 --> 00:00:04,500
Xin chào thế giới!

2
00:00:05,200 --> 00:00:08,750
Đây là phụ đề tiếng Việt.`;

        const vtt = convertSrtToVtt(srt);

        expect(vtt).toContain('WEBVTT');
        expect(vtt).toContain('00:00:01.000 --> 00:00:04.500');
        expect(vtt).toContain('Xin chào thế giới!');
        expect(vtt).toContain('00:00:05.200 --> 00:00:08.750');
        expect(vtt).toContain('Đây là phụ đề tiếng Việt.');
        expect(vtt).not.toContain('00:00:01,000');
    });

    it('handles Windows CRLF line endings correctly', () => {
        const srt = "1\r\n00:01:10,123 --> 00:01:15,456\r\nHello world\r\n";
        const vtt = convertSrtToVtt(srt);
        expect(vtt.startsWith('WEBVTT')).toBe(true);
        expect(vtt).toContain('00:01:10.123 --> 00:01:15.456');
        expect(vtt).toContain('Hello world');
    });
});
