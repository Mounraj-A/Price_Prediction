import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { icon: CheckCircle2, type: 'success' },
  error:   { icon: XCircle,      type: 'error'   },
  info:    { icon: Info,         type: 'info'    },
};

export default function Toast({ message, type = 'info', onClose }) {
  const cfg   = CONFIG[type] || CONFIG.info;
  const Icon  = cfg.icon;
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setTimeout(onClose, 3800);
    return () => clearTimeout(timer.current);
  }, [onClose]);

  return (
    <div className={`toast ${cfg.type}`}>
      <div className="toast-icon">
        <Icon size={16} />
      </div>
      <p className="toast-msg">{message}</p>
      <button className="toast-close" onClick={onClose}>
        <X size={14} />
      </button>
      <div className="toast-bar" />
    </div>
  );
}
