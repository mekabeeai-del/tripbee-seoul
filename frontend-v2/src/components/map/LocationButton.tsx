import { MdMyLocation } from 'react-icons/md';
import './LocationButton.css';

interface LocationButtonProps {
  onClick: () => void;
  isHidden?: boolean;
}

export default function LocationButton({ onClick, isHidden }: LocationButtonProps) {
  return (
    <button className={`location-button ${isHidden ? 'hidden' : ''}`} onClick={onClick}>
      <MdMyLocation size={24} />
    </button>
  );
}
