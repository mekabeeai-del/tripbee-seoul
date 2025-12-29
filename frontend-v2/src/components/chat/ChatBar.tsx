import { useState, useEffect, useRef } from 'react';
import { MdSend, MdMic } from 'react-icons/md';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import './ChatBar.css';

interface ChatBarProps {
  onSendMessage: (message: string) => void;
  onFocus: () => void;
  isChatOpen: boolean;
  isHidden?: boolean;
  language?: 'ko' | 'en' | 'ja';
  onSpeechError?: (error: string) => void;
}

export default function ChatBar({
  onSendMessage,
  onFocus,
  isChatOpen,
  isHidden,
  language = 'ko',
  onSpeechError
}: ChatBarProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 음성인식 훅
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    language,
    onResult: (text) => {
      setMessage(text);
      // 음성인식 결과를 바로 전송
      if (text.trim()) {
        onSendMessage(text);
        setMessage('');
      }
    },
    onError: (error) => {
      onSpeechError?.(error);
    }
  });

  // 채팅창 닫힐 때 입력값 초기화 및 focus 해제
  useEffect(() => {
    if (!isChatOpen) {
      setMessage('');
      inputRef.current?.blur(); // focus 해제
    }
  }, [isChatOpen]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div
      className={`chat-bar ${isChatOpen ? 'active' : ''} ${isHidden ? 'hidden' : ''}`}
      onClick={onFocus}
    >
      {!message && !isFocused && !isChatOpen && (
        <div className="chat-bar-placeholder">
          오늘 여행은 어떤 기분이신가요?
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="chat-bar-input"
      />
      {/* 마이크 버튼 */}
      {isSupported && (
        <button
          className={`chat-bar-mic-btn ${isListening ? 'listening' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isListening) {
              stopListening();
            } else {
              // 채팅창 먼저 열고 마이크 시작
              if (!isChatOpen) {
                onFocus();
              }
              // 약간의 딜레이 후 마이크 시작 (채팅창 애니메이션 고려)
              setTimeout(() => {
                startListening();
              }, 100);
            }
          }}
        >
          <MdMic size={22} />
        </button>
      )}
      <button
        className={`chat-bar-send-btn ${message.trim() ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleSend();
        }}
      >
        <MdSend size={24} />
      </button>

      {/* 음성 녹음 오버레이 */}
      <VoiceRecordingOverlay
        isRecording={isListening}
        onCancel={stopListening}
        language={language}
      />
    </div>
  );
}
