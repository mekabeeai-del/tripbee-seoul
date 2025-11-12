import './BeatyMessage.css';

interface BeatyMessageProps {
  text: string;
}

export default function BeatyMessage({ text }: BeatyMessageProps) {
  return (
    <div className="message-row beaty">
      <div className="message-avatar">
        <img src="/img/beaty/beaty_float.png" alt="Beaty" />
      </div>
      <div className="message-bubble beaty-bubble">
        {text}
      </div>
    </div>
  );
}
