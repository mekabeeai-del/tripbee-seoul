import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
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

/**
 * 음성인식 훅
 * - 네이티브: @capacitor-community/speech-recognition
 * - 웹: Web Speech API
 */
export function useSpeechRecognition({
  language = 'ko',
  onResult,
  onError
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // 웹용 SpeechRecognition ref
  const webRecognitionRef = useRef<globalThis.SpeechRecognition | null>(null);

  // 콜백을 ref로 저장
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  // 취소 플래그
  const cancelledRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    languageRef.current = language;
  }, [onResult, onError, language]);

  // 초기화
  useEffect(() => {
    const init = async () => {
      if (isNative) {
        try {
          const { speechRecognition } = await SpeechRecognition.checkPermissions();
          console.log('[STT] Native permission status:', speechRecognition);

          if (speechRecognition !== 'granted') {
            const result = await SpeechRecognition.requestPermissions();
            setIsSupported(result.speechRecognition === 'granted');
          } else {
            setIsSupported(true);
          }

          const available = await SpeechRecognition.available();
          console.log('[STT] Native available:', available);
          setIsSupported(available.available);

        } catch (error) {
          console.error('[STT] Native init error:', error);
          setIsSupported(false);
        }
      } else {
        // 웹: Web Speech API
        const webSupported = typeof window !== 'undefined' &&
          ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

        if (webSupported) {
          const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = LANG_MAP[language];

          recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (result.isFinal) {
                finalTranscript += result[0].transcript;
              } else {
                interimTranscript += result[0].transcript;
              }
            }

            const currentText = finalTranscript || interimTranscript;
            setTranscript(currentText);

            if (finalTranscript) {
              onResultRef.current?.(finalTranscript);
              setIsListening(false);
            }
          };

          recognition.onerror = (event) => {
            console.error('[STT] Web error:', event.error);
            const t = getTranslation(languageRef.current || 'ko');
            onErrorRef.current?.(t.voice.errors.default);
            setIsListening(false);
          };

          recognition.onend = () => setIsListening(false);

          webRecognitionRef.current = recognition;
          setIsSupported(true);
          console.log('[STT] Web Speech API initialized');
        }
      }
    };

    init();

    return () => {
      if (isNative) {
        SpeechRecognition.removeAllListeners();
        SpeechRecognition.stop().catch(() => {});
      }
    };
  }, [isNative, language]);

  const startListening = useCallback(async () => {
    if (isListening) {
      console.log('[STT] Already listening, ignoring start');
      return;
    }

    setTranscript('');
    setIsListening(true);
    cancelledRef.current = false;

    try {
      if (isNative) {
        const lang = LANG_MAP[languageRef.current] || 'ko-KR';
        console.log('[STT] Starting native speech recognition with language:', lang);

        // 기존 상태 정리
        await SpeechRecognition.removeAllListeners();
        try { await SpeechRecognition.stop(); } catch { /* ignore */ }

        // 실시간 결과 리스너 (partialResults)
        await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          console.log('[STT] partialResults event:', data);
          if (data.matches && data.matches.length > 0 && !cancelledRef.current) {
            const text = data.matches[0];
            setTranscript(text);
          }
        });

        // 음성인식 시작 - Promise 방식으로 최종 결과 받기
        console.log('[STT] Calling SpeechRecognition.start()...');

        const result = await SpeechRecognition.start({
          language: lang,
          maxResults: 5,
          prompt: '',
          partialResults: true,
          popup: false
        });

        console.log('[STT] SpeechRecognition.start() returned:', result);

        // 결과 처리
        if (!cancelledRef.current) {
          if (result && result.matches && result.matches.length > 0) {
            const finalText = result.matches[0];
            console.log('[STT] Final result:', finalText);
            setTranscript(finalText);
            onResultRef.current?.(finalText);
          } else {
            console.log('[STT] No matches in result');
          }
        } else {
          console.log('[STT] Recognition was cancelled');
        }

        // 정리
        await SpeechRecognition.removeAllListeners();
        setIsListening(false);

      } else {
        // 웹 음성인식 시작
        if (webRecognitionRef.current) {
          webRecognitionRef.current.lang = LANG_MAP[languageRef.current];
          webRecognitionRef.current.start();
          console.log('[STT] Web speech recognition started');
        }
      }
    } catch (error) {
      console.error('[STT] Start error:', error);
      if (!cancelledRef.current) {
        onErrorRef.current?.(`음성인식 오류: ${error instanceof Error ? error.message : String(error)}`);
      }
      setIsListening(false);
    }
  }, [isListening, isNative]);

  const stopListening = useCallback(async () => {
    console.log('[STT] stopListening called');

    // 취소 플래그 설정
    cancelledRef.current = true;

    // UI 즉시 업데이트
    setIsListening(false);

    try {
      if (isNative) {
        console.log('[STT] Stopping native speech recognition...');
        await SpeechRecognition.removeAllListeners();
        try {
          await SpeechRecognition.stop();
        } catch {
          // 이미 중지된 경우 무시
        }
      } else {
        if (webRecognitionRef.current) {
          webRecognitionRef.current.stop();
        }
      }
    } catch (error) {
      console.error('[STT] Stop error:', error);
    }

    setTranscript('');
  }, [isNative]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript
  };
}
