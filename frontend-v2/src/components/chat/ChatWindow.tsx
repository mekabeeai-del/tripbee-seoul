import { useState, useEffect, useRef, useMemo } from 'react';
import { MdClose } from 'react-icons/md';
import BeatyMessage from './BeatyMessage';
import UserMessage from './UserMessage';
import { getTranslation, type Language } from '../../locales';
import './ChatWindow.css';

interface Message {
  id: string;
  type: 'beaty' | 'user';
  text: string;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  language?: Language;
}

export default function ChatWindow({ isOpen, onClose, language = 'ko' }: ChatWindowProps) {
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 번역
  const t = useMemo(() => getTranslation(language), [language]);

  // 데모 메시지 생성
  const messages: Message[] = useMemo(() =>
    t.chatDemo.map((msg, index) => ({
      id: String(index + 1),
      type: msg.type as 'beaty' | 'user',
      text: msg.text
    })), [t.chatDemo]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleBackButton = () => {
      if (isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      window.history.pushState({ chatOpen: true }, '');
      window.addEventListener('popstate', handleBackButton);
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`chat-overlay ${isClosing ? 'closing' : ''}`}>
      {/* 배경 */}
      <div className="chat-background" onClick={handleClose} />

      {/* X 버튼 */}
      <button className="chat-close-btn" onClick={handleClose}>
        <MdClose size={28} />
      </button>

      {/* 채팅 영역 */}
      <div className="chat-content-area">
        {messages.map((msg) => (
          msg.type === 'beaty' ? (
            <BeatyMessage key={msg.id} text={msg.text} />
          ) : (
            <UserMessage key={msg.id} text={msg.text} />
          )
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
