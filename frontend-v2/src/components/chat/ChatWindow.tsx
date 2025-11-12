import { useState, useEffect, useRef } from 'react';
import { MdClose } from 'react-icons/md';
import BeatyMessage from './BeatyMessage';
import UserMessage from './UserMessage';
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
}

export default function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages] = useState<Message[]>([
    { id: '1', type: 'beaty', text: '안녕하세요! 오늘은 날씨가 좋네요! 오늘은 어떤 여행을 하고 계신가요?' },
    { id: '2', type: 'user', text: '경복궁 근처 맛집 추천해줘' },
    { id: '3', type: 'beaty', text: '경복궁 근처에 맛집을 찾고 계시는군요! 토속촌 삼계탕, 광장시장, 통인시장 등이 유명해요.' },
    { id: '4', type: 'user', text: '한식으로' },
    { id: '5', type: 'beaty', text: '한식이시군요! 토속촌 삼계탕 추천드려요. 경복궁에서 도보 10분 거리에 있어요.' },
    { id: '6', type: 'user', text: '거기 영업시간이 어떻게 돼?' },
    { id: '7', type: 'beaty', text: '토속촌은 오전 10시부터 오후 10시까지 영업해요. 점심시간에는 대기가 있을 수 있어요!' },
    { id: '8', type: 'user', text: '근처에 카페도 추천해줘' },
    { id: '9', type: 'beaty', text: '삼청동에 좋은 카페들이 많아요. "커피 한약방", "식물" 등이 인기가 많습니다.' },
    { id: '10', type: 'user', text: '한옥 카페 좋다! 위치 알려줘' },
    { id: '11', type: 'beaty', text: '삼청동 한옥 카페 "북촌 숲"을 추천해요. 경복궁에서 도보 15분 정도 걸려요.' },
    { id: '12', type: 'user', text: '명동 쇼핑 장소 추천해줘' },
    { id: '13', type: 'beaty', text: '명동은 쇼핑의 천국이에요! 명동 메인 거리, 롯데백화점, 신세계백화점이 있어요.' },
    { id: '14', type: 'user', text: '화장품 추천 브랜드는?' },
    { id: '15', type: 'beaty', text: '이니스프리, 네이처리퍼블릭, 토니모리 등이 인기 많아요!' },
    { id: '16', type: 'user', text: '홍대 클럽 추천해줘' },
    { id: '17', type: 'beaty', text: '홍대에는 클럽 사운드, 엠프, 브이홀 등 유명한 클럽들이 많아요.' },
    { id: '18', type: 'user', text: '근처에 다이소 찾아줘' },
    { id: '19', type: 'beaty', text: '홍대입구역 8번 출구 근처에 다이소가 있어요. 도보 3분 거리예요.' },
    { id: '20', type: 'user', text: '강남 가볼만한 곳 추천' },
    { id: '21', type: 'beaty', text: '강남에는 코엑스몰, 가로수길, 청담동 명품거리가 유명해요!' }
  ]);

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
