import './UserProfile.css';

interface UserProfileProps {
  onClick: () => void;
  isHomeActive?: boolean;
  isLoggedIn?: boolean;
  userName?: string;
  userEmail?: string;
  profileImageUrl?: string;
}

export default function UserProfile({
  onClick,
  isHomeActive,
  isLoggedIn = false,
  userName = 'Guest',
  userEmail,
  profileImageUrl
}: UserProfileProps) {
  return (
    <div
      className={`user-profile ${isHomeActive ? 'home-active' : ''}`}
      onClick={onClick}
    >
      <div className="user-avatar">
        {isLoggedIn && profileImageUrl ? (
          <img src={profileImageUrl} alt={userName} />
        ) : (
          <div className="user-avatar-placeholder">👤</div>
        )}
      </div>
      <span className="user-name">{userName}</span>
    </div>
  );
}
