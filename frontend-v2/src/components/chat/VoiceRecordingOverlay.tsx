import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdMic, MdClose } from 'react-icons/md';
import { getTranslation, type Language } from '../../locales';
import './VoiceRecordingOverlay.css';

interface VoiceRecordingOverlayProps {
  isRecording: boolean;
  onCancel: () => void;
  language?: Language;
}

/**
 * 음성 녹음 바텀시트
 * - 카카오맵 스타일 UI
 * - 마이크 아이콘 + 음성 파동 애니메이션
 */
export default function VoiceRecordingOverlay({
  isRecording,
  onCancel,
  language = 'ko'
}: VoiceRecordingOverlayProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 예시 문구 순환
  useEffect(() => {
    if (!isRecording) return;

    const t = getTranslation(language);
    const interval = setInterval(() => {
      setExampleIndex(prev => (prev + 1) % t.voice.examples.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isRecording, language]);

  useEffect(() => {
    if (!isRecording) {
      // 정리
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setAudioLevel(0);
      return;
    }

    // 오디오 분석 시작
    const startAudioAnalysis = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // 평균 볼륨 계산
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1);

          setAudioLevel(normalizedLevel);
          animationRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.error('Audio analysis error:', error);
      }
    };

    startAudioAnalysis();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  if (!isRecording) return null;

  const t = getTranslation(language);
  const examples = t.voice.examples;
  const title = t.voice.title;

  // Portal로 body에 직접 렌더링 (부모 CSS 영향 방지)
  return createPortal(
    <>
      {/* 배경 딤 */}
      <div className="voice-backdrop" onClick={onCancel} />

      {/* 바텀시트 */}
      <div className="voice-sheet">
        {/* 닫기 버튼 */}
        <button className="voice-close-btn" onClick={onCancel}>
          <MdClose size={24} />
        </button>

        {/* 안내 텍스트 */}
        <div className="voice-title">{title}</div>

        {/* 예시 문구 */}
        <div className="voice-example">
          "{examples[exampleIndex]}"
        </div>

        {/* 마이크 + 음성 시각화 */}
        <div className="voice-mic-area">
          {/* 음성 파동 원들 */}
          <div
            className="voice-wave wave-1"
            style={{ transform: `scale(${1 + audioLevel * 0.4})` }}
          />
          <div
            className="voice-wave wave-2"
            style={{ transform: `scale(${1 + audioLevel * 0.3})` }}
          />

          {/* 마이크 버튼 */}
          <div className="voice-mic-btn">
            <MdMic size={32} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
