import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

export const usePiP = (videoRef: RefObject<HTMLVideoElement | null>) => {
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [isPiPSupported, setIsPiPSupported] = useState(false);
    const listenersAttached = useRef(false);

    useEffect(() => {
        const standardSupport = 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
        const hasVideo = !!videoRef.current;
        setIsPiPSupported(standardSupport || (hasVideo && 'webkitPresentationMode' in videoRef.current!));
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || listenersAttached.current) return;
        listenersAttached.current = true;

        const onEnterPiP = () => setIsPiPActive(true);
        const onLeavePiP = () => setIsPiPActive(false);
        const onWebKitModeChange = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setIsPiPActive((video as any).webkitPresentationMode === 'picture-in-picture');
        };

        video.addEventListener('enterpictureinpicture', onEnterPiP);
        video.addEventListener('leavepictureinpicture', onLeavePiP);
        video.addEventListener('webkitpresentationmodechanged', onWebKitModeChange);

        return () => {
            video.removeEventListener('enterpictureinpicture', onEnterPiP);
            video.removeEventListener('leavepictureinpicture', onLeavePiP);
            video.removeEventListener('webkitpresentationmodechanged', onWebKitModeChange);
            listenersAttached.current = false;
        };
    });

    const togglePiP = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPiPActive) {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
            return;
        }

        if ('pictureInPictureEnabled' in document) {
            await video.requestPictureInPicture();
        } else if ('webkitSetPresentationMode' in video) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (video as any).webkitSetPresentationMode('picture-in-picture');
        }
    }, [videoRef, isPiPActive]);

    return { isPiPSupported, isPiPActive, togglePiP };
};
