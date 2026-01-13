import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdMic, MdClose } from 'react-icons/md';
import { Capacitor } from '@capacitor/core';
import { getTranslation, type Language } from '../../locales';
import './VoiceRecordingOverlay.css';

interface VoiceRecordingOverlayProps {
  isRecording: boolean;
  onCancel: () => void;
  language?: Language;
  transcript?: string;
}

/**
 * 음성 녹음 바텀시트
 * - 카카오맵 스타일 UI
 * - 마이크 아이콘 + 음성 파동 애니메이션
 */
export default function VoiceRecordingOverlay({
  isRecording,
  onCancel,
  language = 'ko',
  transcript = ''
}: VoiceRecordingOverlayProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // 예시 문구 순환
  useEffect(() => {
    if (!isRecording) return;

    const t = getTranslation(language);
    const interval = setInterval(() => {
      setExampleIndex(prev => (prev + 1) % t.voice.examples.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isRecording, language]);

  // 네이티브용 펄스 애니메이션
  useEffect(() => {
    if (!isRecording || !isNative) return;

    // 네이티브에서는 getUserMedia가 안 되므로 펄스 애니메이션
    let direction = 1;
    let level = 0;

    const animate = () => {
      level += direction * 0.05;
      if (level >= 1) {
        direction = -1;
      } else if (level <= 0.3) {
        direction = 1;
      }
      setAudioLevel(level);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setAudioLevel(0);
    };
  }, [isRecording, isNative]);

  // 웹용 오디오 분석
  useEffect(() => {
    if (!isRecording || isNative) return;

    // 정리 함수
    const cleanup = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);
    };

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
        // 에러 시 펄스 애니메이션 fallback
        let direction = 1;
        let level = 0.3;
        const animate = () => {
          level += direction * 0.03;
          if (level >= 0.8) direction = -1;
          else if (level <= 0.3) direction = 1;
          setAudioLevel(level);
          animationRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    };

    startAudioAnalysis();

    return cleanup;
  }, [isRecording, isNative]);

  if (!isRecording) return null;

  const t = getTranslation(language);
  const examples = t.voice.examples;
  const title = t.voice.title;

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[VoiceOverlay] Close button clicked');
    onCancel();
  };

  // Portal로 body에 직접 렌더링 (부모 CSS 영향 방지)
  return createPortal(
    <>
      {/* 배경 딤 */}
      <div className="voice-backdrop" onClick={handleClose} onTouchEnd={handleClose} />

      {/* 바텀시트 */}
      <div className="voice-sheet">
        {/* 닫기 버튼 */}
        <button
          type="button"
          className="voice-close-btn"
          onClick={handleClose}
          onTouchEnd={handleClose}
        >
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
            style={{ transform: `scale(${1 + audioLevel * 0.5})`, opacity: 0.3 + audioLevel * 0.3 }}
          />
          <div
            className="voice-wave wave-2"
            style={{ transform: `scale(${1 + audioLevel * 0.35})`, opacity: 0.4 + audioLevel * 0.3 }}
          />
          <div
            className="voice-wave wave-3"
            style={{ transform: `scale(${1 + audioLevel * 0.2})`, opacity: 0.5 + audioLevel * 0.3 }}
          />

          {/* 마이크 버튼 */}
          <div className="voice-mic-btn recording">
            <MdMic size={32} />
          </div>
        </div>

        {/* 실시간 텍스트 또는 듣고 있어요 */}
        <div className={`voice-listening-text ${transcript ? 'has-text' : ''}`}>
          {transcript || '듣고 있어요...'}
        </div>
      </div>
    </>,
    document.body
  );
}
