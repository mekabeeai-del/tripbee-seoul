import { useState, useEffect, useRef } from 'react';
import { MdSend } from 'react-icons/md';
import './ChatBar.css';

interface ChatBarProps {
  onSendMessage: (message: string) => void;
  onFocus: () => void;
  isChatOpen: boolean;
}

export default function ChatBar({ onSendMessage, onFocus, isChatOpen }: ChatBarProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      className={`chat-bar ${isChatOpen ? 'active' : ''}`}
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
      <button
        className={`chat-bar-send-btn ${message.trim() ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleSend();
        }}
      >
        <MdSend size={24} />
      </button>
    </div>
  );
}
