'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { OmniClient, OmniEvent, playAudio } from '@/lib/omni-client';

interface RealtimeConversationProps {
  token: string;
  wsUrl?: string;
}

export function RealtimeConversation({ 
  token, 
  wsUrl = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000/ws/omni`
}: RealtimeConversationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<OmniClient | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Play queued audio
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift();
    
    if (audioData) {
      try {
        await playAudio(audioData);
      } catch (e) {
        console.error('Failed to play audio:', e);
      }
    }
    
    isPlayingRef.current = false;
    playNextAudio(); // Play next in queue
  }, []);

  // Handle incoming events
  const handleEvent = useCallback((event: OmniEvent) => {
    console.log('[Realtime] Event:', event.type, event.payload);
    
    switch (event.type) {
      case 'omni_connected':
        setStatus('connected');
        setIsConnected(true);
        break;
      case 'omni_closed':
        setStatus('idle');
        setIsConnected(false);
        setIsRecording(false);
        break;
      case 'omni_error':
      case 'error':
        setError(event.payload.message as string);
        setStatus('error');
        break;
    }
  }, []);

  // Handle incoming text
  const handleText = useCallback((text: string) => {
    setTranscript(prev => [...prev, `AI: ${text}`]);
  }, []);

  // Handle incoming audio
  const handleAudio = useCallback((audioData: ArrayBuffer) => {
    audioQueueRef.current.push(audioData);
    playNextAudio();
  }, [playNextAudio]);

  // Connect to server
  const connect = useCallback(async () => {
    if (clientRef.current?.isConnected) return;

    setStatus('connecting');
    setError(null);

    clientRef.current = new OmniClient({
      wsUrl,
      token,
      onEvent: handleEvent,
      onText: handleText,
      onAudio: handleAudio,
      onError: (err) => {
        setError(err.message);
        setStatus('error');
      },
      onClose: () => {
        setIsConnected(false);
        setIsRecording(false);
        setStatus('idle');
      },
    });

    try {
      await clientRef.current.connect();
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [wsUrl, token, handleEvent, handleText, handleAudio]);

  // Disconnect from server
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setIsRecording(false);
    setStatus('idle');
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!clientRef.current?.isConnected) return;

    try {
      await clientRef.current.startRecording();
      setIsRecording(true);
      setTranscript(prev => [...prev, '🎤 开始录音...']);
    } catch (e) {
      setError('无法访问麦克风');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    clientRef.current?.stopRecording();
    setIsRecording(false);
    setTranscript(prev => [...prev, '🎤 录音结束']);
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Status */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          status === 'connected' ? 'bg-green-100 text-green-700' :
          status === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} />
          {status === 'connected' ? '已连接' :
           status === 'connecting' ? '连接中...' :
           status === 'error' ? '连接失败' :
           '未连接'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Transcript */}
      <div className="w-full max-w-md h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-2">
        {transcript.length === 0 ? (
          <p className="text-gray-400 text-center">对话内容将显示在这里</p>
        ) : (
          transcript.map((line, i) => (
            <p key={i} className={`text-sm ${
              line.startsWith('AI:') ? 'text-blue-600' :
              line.startsWith('🎤') ? 'text-gray-400 italic' :
              'text-gray-800'
            }`}>
              {line}
            </p>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Connect/Disconnect */}
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={status === 'connecting'}
          className={`p-4 rounded-full transition-all ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          } disabled:opacity-50`}
        >
          {isConnected ? <PhoneOff size={24} /> : <Phone size={24} />}
        </button>

        {/* Record button */}
        <button
          onClick={toggleRecording}
          disabled={!isConnected}
          className={`p-6 rounded-full transition-all ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500 text-center max-w-sm">
        {!isConnected 
          ? '点击绿色按钮连接到 AI 助手'
          : isRecording 
            ? '正在录音... 点击麦克风停止'
            : '点击麦克风开始说话'
        }
      </p>
    </div>
  );
}
