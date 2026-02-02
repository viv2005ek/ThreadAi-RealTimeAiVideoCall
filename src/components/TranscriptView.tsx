import { useRef, useEffect, useState } from 'react';
import { Download, Copy, Search, ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface TranscriptViewProps {
  messages: Message[];
  onPlayMessage?: (videoUrl: string | undefined, videoUrls: string[] | undefined, transcript: string) => void;
  transcriptHeight: number;
  onHeightChange: (height: number) => void;
}

export default function TranscriptView({ messages, onPlayMessage, transcriptHeight, onHeightChange }: TranscriptViewProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  function downloadAsPDF() {
    const content = messages
      .map((msg) => {
        const time = msg.createdAt.toLocaleString();
        const sender = msg.sender === 'user' ? 'You' : 'AI';
        return `[${time}] ${sender}: ${msg.text}`;
      })
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyTranscript() {
    const content = messages
      .map((msg) => {
        const time = msg.createdAt.toLocaleString();
        const sender = msg.sender === 'user' ? 'You' : 'AI';
        return `[${time}] ${sender}: ${msg.text}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(content).then(() => {
      alert('Transcript copied to clipboard!');
    });
  }

  function increaseHeight() {
    onHeightChange(Math.min(transcriptHeight + 50, 600));
  }

  function decreaseHeight() {
    onHeightChange(Math.max(transcriptHeight - 50, 200));
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      const newHeight = Math.round(windowHeight - mouseY - 100);
      onHeightChange(Math.max(200, Math.min(600, newHeight)));
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onHeightChange]);

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="px-6 flex flex-col" style={{ height: `${transcriptHeight}px`, minHeight: '200px', maxHeight: '600px' }}>
      <div className="max-w-2xl mx-auto h-full flex flex-col">
        <div
          className="flex items-center justify-center py-1 cursor-ns-resize hover:bg-cyan-500/20 rounded-t-lg transition-colors select-none"
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide heading-font">
              Transcript
            </span>
            <span className="text-xs text-slate-400">{messages.length} messages</span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4 text-cyan-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={copyTranscript}
              className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors"
              title="Copy Transcript"
              disabled={messages.length === 0}
            >
              <Copy className="w-4 h-4 text-cyan-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={downloadAsPDF}
              className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors"
              title="Download Transcript"
              disabled={messages.length === 0}
            >
              <Download className="w-4 h-4 text-cyan-400" />
            </motion.button>
            <div className="flex items-center gap-1 ml-2 border-l border-cyan-500/30 pl-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={decreaseHeight}
                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                title="Decrease Height"
              >
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={increaseHeight}
                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                title="Increase Height"
              >
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              </motion.button>
            </div>
          </div>
        </div>

        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full px-3 py-2 text-sm glass-effect border border-cyan-500/20 rounded-lg focus:outline-none focus:border-cyan-500/50 text-white placeholder-slate-500"
            />
          </motion.div>
        )}

        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto glass-effect rounded-xl border border-cyan-500/20 shadow-2xl scrollbar-thin"
        >
          {filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-sm text-slate-400 text-center">
                {searchQuery
                  ? 'No messages match your search'
                  : 'Start speaking or type a message to begin the conversation'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredMessages.map((msg, index) => (
                <MessageBubble
                  key={index}
                  message={msg}
                  onPlay={onPlayMessage}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
