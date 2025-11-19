import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiFog } from 'react-icons/wi';
import './WeatherButton.css';

interface WeatherButtonProps {
  temperature?: number;
  weatherMain?: string;  // Clear, Clouds, Rain, Snow, etc.
  isLoading?: boolean;
  onClick?: () => void;
}

export default function WeatherButton({ temperature, weatherMain, isLoading, onClick }: WeatherButtonProps) {
  // 날씨에 따른 아이콘 선택
  const getWeatherIcon = () => {
    if (isLoading) return <WiDaySunny className="weather-icon" />;

    switch (weatherMain) {
      case 'Clear':
        return <WiDaySunny className="weather-icon" />;
      case 'Clouds':
        return <WiCloudy className="weather-icon" />;
      case 'Rain':
      case 'Drizzle':
        return <WiRain className="weather-icon" />;
      case 'Snow':
        return <WiSnow className="weather-icon" />;
      case 'Mist':
      case 'Fog':
        return <WiFog className="weather-icon" />;
      default:
        return <WiDaySunny className="weather-icon" />;
    }
  };

  const displayTemp = temperature !== undefined ? Math.round(temperature) : '--';

  return (
    <button className="weather-button" onClick={onClick}>
      {getWeatherIcon()}
      <div className="weather-temp">{displayTemp}°</div>
    </button>
  );
}
