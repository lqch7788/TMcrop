import { AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  type: string;
  title: string;
  content: string;
  sendTime: string;
}

interface AlertItemProps {
  message: Message;
}

export function AlertItem({ message }: AlertItemProps) {
  if (message.type !== 'alert') return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-900">{message.title}</p>
        <p className="text-xs text-red-600 mt-0.5 truncate">{message.content}</p>
      </div>
      <span className="text-xs text-red-400">{message.sendTime.split(' ')[1]}</span>
    </div>
  );
}
