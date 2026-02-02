import { Settings, Upload, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConversationSettings } from '../types';

interface ChatHeaderProps {
  settings: ConversationSettings;
  onSettingsClick: () => void;
  onInviteClick?: () => void;
  showInviteButton?: boolean;
  onRagClick?: () => void;
  showRagButton?: boolean;
}

export default function ChatHeader({
  settings,
  onSettingsClick,
  onInviteClick,
  showInviteButton = false,
  onRagClick,
  showRagButton = false
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 glass-darker border-b border-cyan-500/20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
          />
          <span className="text-sm font-medium text-cyan-300 heading-font">AI Session Active</span>
        </div>
        {settings.language === 'hi' && (
          <span className="px-3 py-1 text-xs glass-effect border border-violet-500/30 text-violet-300 rounded-full">Hindi</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showRagButton && onRagClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRagClick}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-cyan-300 glass-effect border border-cyan-500/30 rounded-lg hover:neon-border transition-all flex items-center gap-2"
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add to RAG</span>
            <span className="sm:hidden">RAG</span>
          </motion.button>
        )}
        {showInviteButton && onInviteClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onInviteClick}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:neon-glow transition-all flex items-center gap-2"
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add People</span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors text-slate-400 hover:text-cyan-400"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
