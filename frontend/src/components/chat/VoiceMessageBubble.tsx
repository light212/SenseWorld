import { memo, useRef, useState, useEffect } from 'react';
import { getAudio, createAudioUrl } from '@/lib/audio-cache';

interface VoiceMessageBubbleProps {
  messageId: string;
  duration?: number;
  isUser?: boolean;
  audioUrl?: string;
}

export const VoiceMessageBubble = memo(function VoiceMessageBubble({
  messageId,
  duration = 0,
  isUser = false,
  audioUrl: propsAudioUrl,
}: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actualDuration, setActualDuration] = useState(duration);
  const [audioUrl, setAudioUrl] = useState<string | null>(propsAudioUrl || null);

  // 声波高度模式
  const staticHeights = [4, 8, 12, 6, 16, 10, 8, 14, 6, 12, 16, 8, 4, 10, 14];

  // 如果没有 propsAudioUrl，尝试从缓存加载
  useEffect(() => {
    if (propsAudioUrl) {
      setAudioUrl(propsAudioUrl);
      return;
    }
    
    if (!messageId) return;
    
    const loadFromCache = async () => {
      try {
        const cached = await getAudio(messageId);
        if (cached?.audioChunks?.length > 0) {
          const url = createAudioUrl(cached.audioChunks);
          setAudioUrl(url);
        }
      } catch (e) {
        console.warn('Failed to load audio from cache:', e);
      }
    };
    
    loadFromCache();
  }, [messageId, propsAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setActualDuration(Math.round(audio.duration * 1000));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const handleClick = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play failed:', err);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer select-none max-w-[200px] transition-all hover:shadow-md ${
        isUser
          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-tr-sm'
          : 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
      }`}
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* 声波动画 */}
      <div className="flex items-center gap-[2px] h-5">
        {staticHeights.map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-150 ${
              isPlaying ? 'animate-pulse' : ''
            } ${isUser ? 'bg-white/70' : 'bg-red-400'}`}
            style={{
              height: isPlaying ? `${h + Math.random() * 8}px` : `${h}px`,
            }}
          />
        ))}
      </div>

      {/* 时长 */}
      <span className={`text-sm font-medium tabular-nums ${
        isUser ? 'text-white/90' : 'text-gray-600'
      }`}>
        {formatTime(actualDuration)}
      </span>
    </div>
  );
});