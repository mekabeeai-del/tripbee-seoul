import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionProps {
  language?: 'ko' | 'en' | 'ja';
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
}

// 언어 코드 매핑
const LANG_MAP: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP'
};

/**
 * Web Speech API 기반 음성인식 훅
 * - 브라우저 내장 STT 사용
 * - Chrome, Edge, Safari 지원
 */
export function useSpeechRecognition({
  language = 'ko',
  onResult,
  onError
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // 콜백을 ref로 저장 (재생성 방지)
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // 브라우저 지원 확인
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // 음성인식 초기화 (한 번만)
  useEffect(() => {
    if (!isSupported) {
      console.log('[STT] Not supported in this browser');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = LANG_MAP[language];

    recognition.onstart = () => {
      console.log('[STT] Started listening');
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      console.log('[STT] Result:', result);
      setTranscript(result);
      onResultRef.current?.(result);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('[STT] Error:', event.error);
      const errorMessages: Record<string, string> = {
        'not-allowed': '마이크 권한이 필요해요',
        'no-speech': '음성이 감지되지 않았어요',
        'audio-capture': '마이크를 찾을 수 없어요',
        'network': '네트워크 오류가 발생했어요',
        'aborted': '음성인식이 취소되었어요'
      };
      onErrorRef.current?.(errorMessages[event.error] || '음성인식 오류가 발생했어요');
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('[STT] Ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    console.log('[STT] Initialized, lang:', LANG_MAP[language]);

    return () => {
      recognition.abort();
    };
  }, [isSupported]);

  // 언어 변경 시 업데이트
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language];
      console.log('[STT] Language changed to:', LANG_MAP[language]);
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.log('[STT] No recognition instance');
      return;
    }
    if (isListening) {
      console.log('[STT] Already listening');
      return;
    }

    try {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
      console.log('[STT] Start called');
    } catch (error) {
      console.error('[STT] Start error:', error);
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
      console.log('[STT] Stop called');
    } catch (error) {
      console.error('[STT] Stop error:', error);
    }
    setIsListening(false);
  }, [isListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript
  };
}
