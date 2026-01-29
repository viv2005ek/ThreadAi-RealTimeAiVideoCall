import { Play, Eye } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onPlay?: (videoUrl: string | undefined, videoUrls: string[] | undefined, transcript: string) => void;
}

export default function MessageBubble({ message, onPlay }: MessageBubbleProps) {
  const hasMedia = message.sender === 'ai' && (message.videoUrl || (message.videoUrls && message.videoUrls.length > 0));
  const hasVisionContext = message.visionContext;

  function handlePlay() {
    if (onPlay && hasMedia) {
      onPlay(message.videoUrl, message.videoUrls, message.transcript || message.text);
    }
  }

  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className="relative group max-w-[85%]">
        {hasMedia && onPlay && (
          <button
            onClick={handlePlay}
            className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
            title="Play response"
          >
            <Play className="w-3 h-3" fill="currentColor" />
          </button>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            message.sender === 'user'
              ? 'bg-gray-900 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>

          {hasVisionContext && message.visionContext && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex items-center gap-1 mb-1">
                <Eye className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Vision Context</span>
              </div>
              <p className="text-xs text-gray-600">
                {message.visionContext.objects.length > 0
                  ? `Detected: ${message.visionContext.objects.map(obj => obj.class).join(', ')}`
                  : 'No objects detected'
                }
              </p>
              {message.visionContext.text && (
                <p className="text-xs text-gray-600 mt-1">
                  Text: "{message.visionContext.text}"
                </p>
              )}
            </div>
          )}

          <p className={`text-xs mt-1 ${
            message.sender === 'user' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}
