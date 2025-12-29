import { useState, useRef, useCallback, useEffect } from 'react';
import { getTranslation, type Language } from '../locales';

interface UseSpeechRecognitionProps {
  language?: Language;
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
  const languageRef = useRef(language);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    languageRef.current = language;
  }, [onResult, onError, language]);

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
      const t = getTranslation(languageRef.current || 'ko');
      const errorMessages: Record<string, string> = {
        'not-allowed': t.voice.errors.notAllowed,
        'no-speech': t.voice.errors.noSpeech,
        'audio-capture': t.voice.errors.audioCapture,
        'network': t.voice.errors.network,
        'aborted': t.voice.errors.default
      };
      onErrorRef.current?.(errorMessages[event.error] || t.voice.errors.default);
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
