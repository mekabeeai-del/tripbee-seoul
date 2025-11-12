import './UserMessage.css';

interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="message-row user">
      <div className="message-bubble user-bubble">
        {text}
      </div>
    </div>
  );
}
