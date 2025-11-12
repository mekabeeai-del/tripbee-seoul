import { WiDaySunny } from 'react-icons/wi';
import './WeatherButton.css';

interface WeatherButtonProps {
  temperature: number;
  onClick?: () => void;
}

export default function WeatherButton({ temperature, onClick }: WeatherButtonProps) {
  return (
    <button className="weather-button" onClick={onClick}>
      <WiDaySunny className="weather-icon" />
      <div className="weather-temp">{temperature}°</div>
    </button>
  );
}
