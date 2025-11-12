import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onMenuClick?: () => void;
  isLoading?: boolean;
  onQuickAction?: (action: string) => void;
  isPanelOpen?: boolean;
  googlePanelHeight?: 'half' | 'full' | null;
  ktoPanelHeight?: 'half' | 'full' | null;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onMenuClick, isLoading = false, onQuickAction, isPanelOpen = false, googlePanelHeight = null, ktoPanelHeight = null }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      right: '20px',
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px 16px',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={onMenuClick}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '5px',
              padding: 0
            }}
          >
            <div style={{ width: '20px', height: '2px', backgroundColor: '#333' }}></div>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#333' }}></div>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#333' }}></div>
          </button>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="오늘은 어디로 떠나볼까요?"
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              backgroundColor: 'transparent',
              color: '#333'
            }}
          />

          <button
            type="button"
            style={{
              width: '20px',
              height: '20px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            style={{
              padding: '8px 12px',
              backgroundColor: isLoading || !query.trim() ? '#ccc' : '#4A90E2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            ➤
          </button>
        </div>
      </form>

      {/* 퀵 액션 버튼들 - 패널이 닫혀있고 full 모드가 아닐 때만 표시 */}
      {!isPanelOpen && googlePanelHeight !== 'full' && ktoPanelHeight !== 'full' && (
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: '8px',
        justifyContent: 'flex-start'
      }}>
        <button
          type="button"
          onClick={() => onQuickAction?.('intro')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#666',
            border: 'none',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          🏙️ 서울소개
        </button>

        <button
          type="button"
          onClick={() => onQuickAction?.('landmark')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#666',
            border: 'none',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          🏛️ 랜드마크
        </button>

        <button
          type="button"
          onClick={() => onQuickAction?.('route')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#666',
            border: 'none',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          🗺️ 여행경로
        </button>
      </div>
      )}
    </div>
  );
};

export default SearchBar;
