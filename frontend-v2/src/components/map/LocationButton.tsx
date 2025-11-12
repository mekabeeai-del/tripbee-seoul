import { MdMyLocation } from 'react-icons/md';
import './LocationButton.css';

interface LocationButtonProps {
  onClick: () => void;
}

export default function LocationButton({ onClick }: LocationButtonProps) {
  return (
    <button className="location-button" onClick={onClick}>
      <MdMyLocation size={24} />
    </button>
  );
}
