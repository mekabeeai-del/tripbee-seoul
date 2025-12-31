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

// 언어 코드 매핑 (Whisper용)
const LANG_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja'
};

// OpenAI Whisper API 엔드포인트
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * 음성인식 훅
 * - MediaRecorder + OpenAI Whisper API 사용
 * - WebView 환경에서도 동작
 */
export function useSpeechRecognition({
  language = 'ko',
  onResult,
  onError
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 콜백을 ref로 저장 (재생성 방지)
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    languageRef.current = language;
  }, [onResult, onError, language]);

  // 초기화: MediaRecorder 지원 여부 확인
  useEffect(() => {
    const checkSupport = () => {
      const hasNavigator = typeof navigator !== 'undefined';
      const hasMediaDevices = hasNavigator && !!navigator.mediaDevices;
      const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasApiKey = !!OPENAI_API_KEY;

      console.log('[STT] Support check:', {
        hasNavigator,
        hasMediaDevices,
        hasGetUserMedia,
        hasMediaRecorder,
        hasApiKey,
        apiKeyLength: OPENAI_API_KEY?.length || 0
      });

      // 항상 지원하는 것으로 표시 (에러는 실행 시 처리)
      setIsSupported(true);
    };

    checkSupport();
  }, []);

  // Whisper API로 음성을 텍스트로 변환
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', LANG_MAP[languageRef.current] || 'ko');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[STT] Whisper API error:', error);
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.text || '';
  };

  const startListening = useCallback(async () => {
    if (isListening) {
      console.log('[STT] Already listening');
      return;
    }

    setTranscript('');
    audioChunksRef.current = [];

    // 사전 체크
    if (!navigator.mediaDevices) {
      console.error('[STT] navigator.mediaDevices not available');
      onErrorRef.current?.('마이크를 사용할 수 없어요 (mediaDevices 없음)');
      return;
    }

    if (!OPENAI_API_KEY) {
      console.error('[STT] OpenAI API key missing');
      onErrorRef.current?.('API 키가 설정되지 않았어요');
      return;
    }

    try {
      console.log('[STT] Requesting microphone permission...');

      // 마이크 접근 권한 요청 (단순한 설정으로)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      streamRef.current = stream;
      console.log('[STT] Microphone permission granted');

      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[STT] Recording stopped, processing...');

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // 오디오 청크가 있으면 Whisper API 호출
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          try {
            const text = await transcribeAudio(audioBlob);
            console.log('[STT] Result:', text);

            if (text.trim()) {
              setTranscript(text);
              onResultRef.current?.(text);
            } else {
              const t = getTranslation(languageRef.current || 'ko');
              onErrorRef.current?.(t.voice.errors.noSpeech);
            }
          } catch (error) {
            console.error('[STT] Transcription error:', error);
            const t = getTranslation(languageRef.current || 'ko');
            onErrorRef.current?.(t.voice.errors.network);
          }
        }

        setIsListening(false);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[STT] MediaRecorder error:', event);
        const t = getTranslation(languageRef.current || 'ko');
        onErrorRef.current?.(t.voice.errors.default);
        setIsListening(false);
      };

      // 녹음 시작
      mediaRecorder.start(100); // 100ms 간격으로 데이터 수집
      setIsListening(true);
      console.log('[STT] Recording started');

    } catch (error) {
      console.error('[STT] Start error:', error);

      // 에러 메시지를 구체적으로 표시
      let errorMsg = '음성인식 오류';
      if (error instanceof Error) {
        errorMsg = `오류: ${error.name} - ${error.message}`;
      } else if (error instanceof DOMException) {
        errorMsg = `DOM 오류: ${error.name}`;
      } else {
        errorMsg = `알 수 없는 오류: ${String(error)}`;
      }

      onErrorRef.current?.(errorMsg);
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        console.log('[STT] Stop called');
      }
    } catch (error) {
      console.error('[STT] Stop error:', error);
      setIsListening(false);
    }
  }, [isListening]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript
  };
}
