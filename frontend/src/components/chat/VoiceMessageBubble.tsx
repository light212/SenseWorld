import { memo, useRef, useState, useEffect } from 'react';
import { getAudio, createAudioUrl } from '@/lib/audio-cache';

// 全局追踪当前播放的音频，避免重音
let currentPlayingAudio: HTMLAudioElement | null = null;

interface VoiceMessageBubbleProps {
  messageId: string;
  duration?: number;
  isUser?: boolean;
  audioUrl?: string;
}

export const VoiceMessageBubble = memo(function VoiceMessageBubble({
  messageId,
  duration: propDuration = 0,
  isUser = false,
  audioUrl: propsAudioUrl,
}: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(propsAudioUrl || null);
  const [duration, setDuration] = useState(propDuration);

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
        if (cached?.audioChunks?.length) {
          const url = createAudioUrl(cached.audioChunks);
          setAudioUrl(url);
          // 从缓存加载时长（如果有的话）
          if (cached.duration && cached.duration > 0) {
            setDuration(cached.duration);
          }
        }
      } catch (e) {
        // Ignore
      }
    };
    
    loadFromCache();
  }, [messageId, propsAudioUrl]);
  
  // 当 propsAudioUrl 变化时，也更新时长（如果有 propDuration）
  useEffect(() => {
    if (propDuration > 0) {
      setDuration(propDuration);
    }
  }, [propDuration]);

  const handleClick = async () => {
    if (!audioUrl) return;
    
    // 停止其他正在播放的音频
    if (currentPlayingAudio && currentPlayingAudio !== audioRef.current) {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    }

    if (isPlaying && audioRef.current) {
      // 暂停
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      currentPlayingAudio = null;
    } else {
      // 播放
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current?.duration && isFinite(audioRef.current.duration)) {
            setDuration(Math.round(audioRef.current.duration * 1000));
          }
        };
        audioRef.current.onended = () => {
          setIsPlaying(false);
          currentPlayingAudio = null;
        };
      }
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        currentPlayingAudio = audioRef.current;
      } catch (err) {
        // 播放失败，尝试从 IndexedDB 重新加载
        if (audioUrl.startsWith('blob:')) {
          try {
            const cached = await getAudio(messageId);
            if (cached?.audioChunks?.length) {
              const newUrl = createAudioUrl(cached.audioChunks);
              setAudioUrl(newUrl);
              audioRef.current = new Audio(newUrl);
              await audioRef.current.play();
              setIsPlaying(true);
              currentPlayingAudio = audioRef.current;
            }
          } catch (e) {
            // Ignore
          }
        }
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
        {formatTime(duration)}
      </span>
    </div>
  );
});