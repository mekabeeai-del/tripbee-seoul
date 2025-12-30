import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeechRecognition as CapacitorSpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
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

// Capacitor 네이티브 환경인지 확인
const isNative = Capacitor.isNativePlatform();

/**
 * 음성인식 훅
 * - Capacitor 앱: 네이티브 STT 사용
 * - 웹 브라우저: Web Speech API 사용
 */
export function useSpeechRecognition({
  language = 'ko',
  onResult,
  onError
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
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

  // 초기화: 네이티브 or 웹
  useEffect(() => {
    const init = async () => {
      if (isNative) {
        // Capacitor 네이티브: 권한 체크
        try {
          const { speechRecognition } = await CapacitorSpeechRecognition.checkPermissions();
          if (speechRecognition === 'granted') {
            setIsSupported(true);
          } else {
            const result = await CapacitorSpeechRecognition.requestPermissions();
            setIsSupported(result.speechRecognition === 'granted');
          }
          console.log('[STT] Native mode initialized');
        } catch (error) {
          console.error('[STT] Native init error:', error);
          setIsSupported(false);
        }
      } else {
        // 웹 브라우저: Web Speech API
        const webSupported = typeof window !== 'undefined' &&
          ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

        if (webSupported) {
          const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognitionAPI();

          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = LANG_MAP[language];

          recognition.onstart = () => {
            console.log('[STT] Web started listening');
          };

          recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            console.log('[STT] Web result:', result);
            setTranscript(result);
            onResultRef.current?.(result);
            setIsListening(false);
          };

          recognition.onerror = (event) => {
            console.error('[STT] Web error:', event.error);
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
            console.log('[STT] Web ended');
            setIsListening(false);
          };

          recognitionRef.current = recognition;
          setIsSupported(true);
          console.log('[STT] Web mode initialized');
        }
      }
    };

    init();

    return () => {
      if (!isNative && recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // 언어 변경 시 업데이트 (웹만)
  useEffect(() => {
    if (!isNative && recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language];
      console.log('[STT] Language changed to:', LANG_MAP[language]);
    }
  }, [language]);

  const startListening = useCallback(async () => {
    if (isListening) {
      console.log('[STT] Already listening');
      return;
    }

    setTranscript('');
    setIsListening(true);

    try {
      if (isNative) {
        // Capacitor 네이티브 STT
        console.log('[STT] Native start');
        await CapacitorSpeechRecognition.start({
          language: LANG_MAP[language],
          partialResults: false,
          popup: false
        });

        // 결과 리스너 등록
        CapacitorSpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            const result = data.matches[0];
            console.log('[STT] Native result:', result);
            setTranscript(result);
            onResultRef.current?.(result);
            setIsListening(false);
            CapacitorSpeechRecognition.stop();
          }
        });
      } else {
        // 웹 STT
        if (recognitionRef.current) {
          recognitionRef.current.start();
          console.log('[STT] Web start called');
        }
      }
    } catch (error) {
      console.error('[STT] Start error:', error);
      const t = getTranslation(languageRef.current || 'ko');
      onErrorRef.current?.(t.voice.errors.default);
      setIsListening(false);
    }
  }, [isListening, language]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      if (isNative) {
        await CapacitorSpeechRecognition.stop();
        CapacitorSpeechRecognition.removeAllListeners();
        console.log('[STT] Native stop');
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log('[STT] Web stop');
      }
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
