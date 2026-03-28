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
  console.log('[VoiceMessageBubble] props:', { 
    messageId: messageId?.slice(0,8), 
    isUser, 
    hasPropsUrl: !!propsAudioUrl, 
    propsAudioUrl: propsAudioUrl?.slice(0, 40) 
  });
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(propsAudioUrl || null);
  const [duration, setDuration] = useState(propDuration);

  // 声波高度模式
  const staticHeights = [4, 8, 12, 6, 16, 10, 8, 14, 6, 12, 16, 8, 4, 10, 14];

  // 如果没有 propsAudioUrl，尝试从缓存加载
  useEffect(() => {
    if (propsAudioUrl && propsAudioUrl.length > 0) {
      setAudioUrl(propsAudioUrl);
      return;
    }
    
    if (!messageId) return;
    
    const loadFromCache = async () => {
      try {
        console.log('[VoiceMessageBubble] Loading from IndexedDB:', messageId?.slice(0,8));
        const cached = await getAudio(messageId);
        console.log('[VoiceMessageBubble] IndexedDB result:', cached ? `${cached.audioChunks?.length} chunks` : 'null');
        if (cached?.audioChunks?.length) {
          const url = createAudioUrl(cached.audioChunks);
          console.log('[VoiceMessageBubble] Created URL from cache:', url?.slice(0, 40));
          setAudioUrl(url);
        }
      } catch (e) {
        console.warn('[VoiceMessageBubble] Cache error:', e);
      }
    };
    
    loadFromCache();
  }, [messageId, propsAudioUrl]);

  // 从音频元素获取时长
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration * 1000));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (currentPlayingAudio === audio) {
        currentPlayingAudio = null;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // 确保 audio 元素初始化
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        currentPlayingAudio = null;
      };
    }
    
    return () => {
      // 清理
      if (audioRef.current && !audioRef.current.src.includes('blob:')) {
        // 只清理非 blob URL
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handleClick = async () => {
    if (!audioUrl) {
      console.warn('[VoiceMessageBubble] Cannot play: no url');
      return;
    }
    
    // 确保 audio 存在
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        currentPlayingAudio = null;
      };
    }
    
    const audio = audioRef.current;

    if (isPlaying) {
      // 当前正在播放，暂停
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      currentPlayingAudio = null;
    } else {
      // 停止其他正在播放的音频
      if (currentPlayingAudio && currentPlayingAudio !== audio) {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
      }
      
      // 播放当前音频
      try {
        await audio.play();
        setIsPlaying(true);
        currentPlayingAudio = audio;
      } catch (err) {
        // 如果是 blob URL 失效，尝试从 IndexedDB 加载
        if (audioUrl.startsWith('blob:')) {
          try {
            const cached = await getAudio(messageId);
            if (cached?.audioChunks?.length) {
              const newUrl = createAudioUrl(cached.audioChunks);
              setAudioUrl(newUrl);
              if (audioRef.current) {
                audioRef.current.src = newUrl;
                await audioRef.current.play();
                setIsPlaying(true);
                currentPlayingAudio = audioRef.current;
              }
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
        {formatTime(duration)}
      </span>
    </div>
  );
});