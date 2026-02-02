import { Play, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className="relative group max-w-[85%]">
        {hasMedia && onPlay && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full shadow-lg hover:neon-glow transition-all duration-300"
            title="Play response"
          >
            <Play className="w-4 h-4" fill="currentColor" />
          </motion.button>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl border ${
            message.sender === 'user'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border-cyan-500/30 rounded-br-md'
              : 'glass-effect text-slate-200 border-blue-500/20 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>

          {hasVisionContext && message.visionContext && (
            <div className="mt-2 pt-2 border-t border-cyan-500/30">
              <div className="flex items-center gap-1 mb-1">
                <Eye className="w-3 h-3 text-violet-400" />
                <span className="text-xs font-medium text-violet-400 heading-font">Vision Context</span>
              </div>
              <p className="text-xs text-slate-400">
                {message.visionContext.objects.length > 0
                  ? `Detected: ${message.visionContext.objects.map(obj => obj.class).join(', ')}`
                  : 'No objects detected'
                }
              </p>
              {message.visionContext.text && (
                <p className="text-xs text-slate-400 mt-1">
                  Text: "{message.visionContext.text}"
                </p>
              )}
            </div>
          )}

          <p className={`text-xs mt-1 ${
            message.sender === 'user' ? 'text-cyan-400/70' : 'text-slate-500'
          }`}>
            {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
