import './UserProfile.css';

interface UserProfileProps {
  onClick: () => void;
  isHomeActive?: boolean;
}

export default function UserProfile({ onClick, isHomeActive }: UserProfileProps) {
  return (
    <div
      className={`user-profile ${isHomeActive ? 'home-active' : ''}`}
      onClick={onClick}
    >
      <div className="user-avatar">
        <img src="/img/temp/user_profile.png" alt="User" />
      </div>
      <span className="user-name">홍길동 님</span>
    </div>
  );
}
