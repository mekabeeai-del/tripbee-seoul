import { useEffect, useState } from 'react';
import type { FaqCard } from '../../data/faqCards';
import StreamingText from '../common/StreamingText';
import './FaqCardModal.css';

interface FaqCardModalProps {
  faq: FaqCard;
  language?: 'en' | 'ko' | 'ja';
  onClose: () => void;
}

export default function FaqCardModal({ faq, language = 'en', onClose }: FaqCardModalProps) {
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const title = language === 'ja' ? faq.title_ja : language === 'ko' ? faq.title_ko : faq.title_en;
  const content = language === 'ja' ? faq.content_ja : language === 'ko' ? faq.content_ko : faq.content_en;
  const closing = language === 'ja' ? faq.closing_ja : language === 'ko' ? faq.closing_ko : faq.closing_en;
  const tips = language === 'ja' ? faq.tips_ja : language === 'ko' ? faq.tips_ko : faq.tips_en;

  // Combine content with closing message - filter out empty strings and use single line break
  const filteredContent = content.filter(line => line !== '');
  const fullText = closing
    ? filteredContent.join('\n') + '\n\n' + closing
    : filteredContent.join('\n');

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="faq-modal-backdrop" onClick={onClose} />

      {/* Modal Card */}
      <div className="faq-modal-card">
        {/* Header */}
        <div className="faq-modal-header">
          <div className="faq-modal-emoji">{faq.emoji}</div>
          <h2 className="faq-modal-title">{title}</h2>
          <button className="faq-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Beaty Bubble with Streaming Text */}
        <div className="faq-modal-content">
          <div className="faq-beaty-container">
            <div className="faq-beaty-avatar">
              <img src="/img/beaty/beaty_float.png" alt="비티" />
            </div>
            <div className="faq-beaty-bubble">
              <div className="faq-beaty-text">
                <StreamingText
                  text={fullText}
                  speed={20}
                  showCursor={true}
                  onComplete={() => setIsTypingComplete(true)}
                />
              </div>
            </div>
          </div>

          {/* Tips Section (타이핑 완료 후 표시) */}
          {isTypingComplete && tips && tips.length > 0 && (
            <div className="faq-modal-tips">
              <div className="faq-modal-tips-title">💡 Pro Tips</div>
              {tips.map((tip, index) => (
                <div key={index} className="faq-modal-tip">
                  • {tip}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="faq-modal-footer">
          <button
            className="faq-modal-got-it"
            onClick={onClose}
            disabled={!isTypingComplete}
          >
            {language === 'ja' ? 'わかりました！👍' : language === 'ko' ? '알겠어요! 👍' : 'Got it! 👍'}
          </button>
        </div>
      </div>
    </>
  );
}
