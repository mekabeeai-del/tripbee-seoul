import { useState, useMemo } from 'react';
import { MdClose, MdAdd, MdRemove, MdCalendarToday, MdAccessTime, MdPeople } from 'react-icons/md';
import { getTranslation, type Language } from '../../locales';
import './ReservationPanel.css';

interface ReservationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  poiName: string;
  language?: Language;
  onConfirm?: (reservation: ReservationData) => void;
}

export interface ReservationData {
  date: string;
  time: string;
  adults: number;
  children: number;
}

export default function ReservationPanel({
  isOpen,
  onClose,
  poiName,
  language = 'ko',
  onConfirm
}: ReservationPanelProps) {
  const t = useMemo(() => getTranslation(language), [language]);

  // 오늘 날짜를 기본값으로
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // 시간 슬롯 생성 (9:00 ~ 21:00, 30분 간격)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 21) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // 인원 수 증가/감소
  const incrementAdults = () => setAdults(prev => Math.min(prev + 1, 20));
  const decrementAdults = () => setAdults(prev => Math.max(prev - 1, 1));
  const incrementChildren = () => setChildren(prev => Math.min(prev + 1, 20));
  const decrementChildren = () => setChildren(prev => Math.max(prev - 1, 0));

  // 예약 확인
  const handleConfirm = () => {
    const reservation: ReservationData = {
      date: selectedDate,
      time: selectedTime,
      adults,
      children
    };
    onConfirm?.(reservation);
    onClose();
  };

  // 최소 날짜 (오늘)
  const minDate = todayStr;

  // 최대 날짜 (3개월 후)
  const maxDateObj = new Date(today);
  maxDateObj.setMonth(maxDateObj.getMonth() + 3);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="reservation-panel">
      <div className="reservation-backdrop" onClick={onClose} />
      <div className="reservation-content">
        {/* 헤더 */}
        <div className="reservation-header">
          <h2>{t.reservation.title}</h2>
          <button className="reservation-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* POI 이름 */}
        <div className="reservation-poi-name">
          <span className="poi-icon">📍</span>
          {poiName}
        </div>

        {/* 예약 폼 */}
        <div className="reservation-form">
          {/* 날짜 선택 */}
          <div className="form-section">
            <div className="section-label">
              <MdCalendarToday className="label-icon" />
              <span>{t.reservation.date}</span>
            </div>
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
            />
          </div>

          {/* 시간 선택 */}
          <div className="form-section">
            <div className="section-label">
              <MdAccessTime className="label-icon" />
              <span>{t.reservation.time}</span>
            </div>
            <div className="time-slots">
              {timeSlots.map(time => (
                <button
                  key={time}
                  className={`time-slot ${selectedTime === time ? 'active' : ''}`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 인원 수 선택 */}
          <div className="form-section">
            <div className="section-label">
              <MdPeople className="label-icon" />
              <span>{t.reservation.guests}</span>
            </div>

            {/* 성인 */}
            <div className="guest-counter">
              <div className="counter-label">
                <span className="counter-name">{t.reservation.adults}</span>
                <span className="counter-desc">{t.reservation.adultsDesc}</span>
              </div>
              <div className="counter-controls">
                <button
                  className="counter-btn"
                  onClick={decrementAdults}
                  disabled={adults <= 1}
                >
                  <MdRemove />
                </button>
                <span className="counter-value">{adults}</span>
                <button
                  className="counter-btn"
                  onClick={incrementAdults}
                  disabled={adults >= 20}
                >
                  <MdAdd />
                </button>
              </div>
            </div>

            {/* 어린이 */}
            <div className="guest-counter">
              <div className="counter-label">
                <span className="counter-name">{t.reservation.children}</span>
                <span className="counter-desc">{t.reservation.childrenDesc}</span>
              </div>
              <div className="counter-controls">
                <button
                  className="counter-btn"
                  onClick={decrementChildren}
                  disabled={children <= 0}
                >
                  <MdRemove />
                </button>
                <span className="counter-value">{children}</span>
                <button
                  className="counter-btn"
                  onClick={incrementChildren}
                  disabled={children >= 20}
                >
                  <MdAdd />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 예약 요약 및 확인 버튼 */}
        <div className="reservation-summary">
          <div className="summary-info">
            <div className="summary-item">
              <MdCalendarToday size={16} />
              <span>{selectedDate}</span>
            </div>
            <div className="summary-item">
              <MdAccessTime size={16} />
              <span>{selectedTime}</span>
            </div>
            <div className="summary-item">
              <MdPeople size={16} />
              <span>
                {t.reservation.totalGuests(adults + children)}
              </span>
            </div>
          </div>
          <button className="confirm-button" onClick={handleConfirm}>
            {t.reservation.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
