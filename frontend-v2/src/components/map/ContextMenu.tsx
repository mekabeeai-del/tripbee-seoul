import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  return (
    <div
      className="context-menu"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {/* 여기에 새로운 메뉴 항목 추가 */}
    </div>
  );
}
