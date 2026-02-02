/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, Settings } from 'lucide-react';
import { Paperclip } from 'lucide-react';

import { 
  Message, 
  ConversationSettings, 
  DEFAULT_CONVERSATION_SETTINGS 
} from '../types';
import { subscribeToMessages, addMessage, subscribeToConversation, updateConversationSettings } from '../services/firestore';
import { generateAIResponse } from '../services/mockAI';
import { generateAvatarVideo, GooeyVideoResponse } from '../services/gooey'; // Import GooeyVideoResponse from gooey.ts
import { speakText, stopSpeaking } from '../services/tts';
import AvatarSettingsPanel from './AvatarSettingsPanel';
import VideoPlayer, { VideoState } from './VideoPlayer';

interface ChatViewProps {
  conversationId: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function ChatView({ conversationId }: ChatViewProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
const [attachmentContext, setAttachmentContext] = useState<string>(''); 
const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [videoState, setVideoState] = useState<VideoState>('idle');
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>(DEFAULT_CONVERSATION_SETTINGS);
  const [transcriptMessages, setTranscriptMessages] = useState<Message[]>([]);
  const [gooeyResponse, setGooeyResponse] = useState<GooeyVideoResponse | null>(null); // Add this line

  const transcriptRef = useRef<HTMLDivElement>(null);
  const currentConversationRef = useRef<string>(conversationId);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingTranscriptRef = useRef<string>('');
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = settings.language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        pendingTranscriptRef.current = finalTranscript.trim();
        setInput(finalTranscript.trim());
      } else if (interimTranscript) {
        setInput(interimTranscript);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access denied');
      } else if (event.error === 'no-speech') {
        setSpeechError('No speech detected');
      }
      setIsListening(false);
      setVideoState('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (pendingTranscriptRef.current) {
        const transcript = pendingTranscriptRef.current;
        pendingTranscriptRef.current = '';
        handleSendWithText(transcript);
      } else {
        setVideoState('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopSpeaking();
    };
  }, [settings.language]);

  useEffect(() => {
    currentConversationRef.current = conversationId;

    stopSpeaking();
    setMessages([]);
    setInput('');
    setVideoState('idle');
    setCurrentCaption('');
    setCurrentVideoUrl(null);
    setGooeyResponse(null); // Clear gooey response
    setSettings(DEFAULT_CONVERSATION_SETTINGS);
    setTranscriptMessages([]);

    const unsubscribeMessages = subscribeToMessages(conversationId, (msgs) => {
      if (currentConversationRef.current === conversationId) {
        setMessages(msgs);
      }
    });

    const unsubscribeConversation = subscribeToConversation(conversationId, (conv) => {
      if (conv && currentConversationRef.current === conversationId) {
        setSettings(conv.settings || DEFAULT_CONVERSATION_SETTINGS);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeConversation();
      stopSpeaking();
    };
  }, [conversationId]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptMessages]);

  const handleSendWithText = useCallback(async (text: string) => {
    if (!text.trim() || videoState === 'thinking' || videoState === 'speaking') return;

    const userMessage = text.trim();
    const targetConversationId = currentConversationRef.current;
    const currentSettings = settings;
    const conversationHistory = messagesRef.current;

    setInput('');
    setVideoState('thinking');
    setCurrentVideoUrl(null);
    setGooeyResponse(null); // Clear previous response

    try {
      await addMessage({
        conversationId: targetConversationId,
        sender: 'user',
        text: userMessage,
        createdAt: new Date()
      });

const enhancedUserMessage = attachmentContext
  ? `Attached content context:\n${attachmentContext}\n\nUser query:\n${userMessage}`
  : userMessage;

const responseText = await generateAIResponse(
  enhancedUserMessage,
  currentSettings,
  conversationHistory
);

      if (currentConversationRef.current !== targetConversationId) {
        return;
      }

      setCurrentCaption(responseText);

      function prepareTextForVideo(text: string): string {
        const cleaned = text
          .replace(/\s+/g, ' ')
          .replace(/\n/g, ' ')
          .trim();

        // Ensure sentence completion
        if (!/[.!?।]$/.test(cleaned)) {
          return cleaned + '।';
        }

        return cleaned;
      }

      const safeText = prepareTextForVideo(responseText);

      const gooeyResponseResult = await generateAvatarVideo({
        text: safeText,
        language: currentSettings.language,
        avatarUrl: currentSettings.avatarMediaUrl,
        gender: currentSettings.avatarVoiceGender
      });

      setGooeyResponse(gooeyResponseResult);

      if (currentConversationRef.current !== targetConversationId) {
        return;
      }

      await addMessage({
        conversationId: targetConversationId,
        sender: 'ai',
        text: responseText,
        transcript: responseText,
        videoUrl: gooeyResponseResult.videoUrl,
        videoUrls: gooeyResponseResult.videoUrls,
        createdAt: new Date()
      });

setAttachments([]);
setAttachmentContext('');

      setTranscriptMessages((prev) => [...prev,
        { conversationId: targetConversationId, sender: 'user', text: userMessage, createdAt: new Date() },
        { conversationId: targetConversationId, sender: 'ai', text: responseText, transcript: responseText, videoUrl: gooeyResponseResult.videoUrl, videoUrls: gooeyResponseResult.videoUrls, createdAt: new Date() }
      ]);

      if (gooeyResponseResult.success) {
        if (gooeyResponseResult.videoUrls && gooeyResponseResult.videoUrls.length > 0) {
          // Multiple video chunks - pass them to VideoPlayer
          setVideoState('speaking');
          // VideoPlayer will handle playing them sequentially
        } else if (gooeyResponseResult.videoUrl) {
          // Single video (backward compatibility)
          setCurrentVideoUrl(gooeyResponseResult.videoUrl);
          setVideoState('speaking');
        } else {
          // No video URL - fallback to TTS
          setVideoState('speaking');
          await speakText(
            responseText,
            currentSettings.tone,
            undefined,
            () => {
              if (currentConversationRef.current === targetConversationId) {
                setVideoState('idle');
                setCurrentCaption('');
                setCurrentVideoUrl(null);
                setGooeyResponse(null);
              }
            }
          );
        }
      } else {
        // Gooey failed - fallback to TTS
        setVideoState('speaking');
        await speakText(
          responseText,
          currentSettings.tone,
          undefined,
          () => {
            if (currentConversationRef.current === targetConversationId) {
              setVideoState('idle');
              setCurrentCaption('');
              setCurrentVideoUrl(null);
              setGooeyResponse(null);
            }
          }
        );
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setVideoState('idle');
      setCurrentCaption('');
      setCurrentVideoUrl(null);
      setGooeyResponse(null);
    }
  }, [videoState, settings]);

  async function handleSend() {
    await handleSendWithText(input);
  }

  function handleVideoEnded() {
    setTimeout(() => {
      setVideoState('idle');
      setCurrentCaption('');
      setCurrentVideoUrl(null);
      setGooeyResponse(null); // Clear the response
    }, 700);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleListening() {
    if (!speechSupported) {
      setSpeechError('Voice input not supported in this browser');
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVideoState('idle');
    } else {
      setSpeechError(null);
      pendingTranscriptRef.current = '';
      recognitionRef.current.lang = settings.language === 'hi' ? 'hi-IN' : 'en-US';
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setVideoState('listening');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setSpeechError('Failed to start voice input');
      }
    }
  }
  function removeAttachment(index: number) {
  setAttachments(prev => prev.filter((_, i) => i !== index));

  setAttachmentContext(prev => {
    // Conservative: wipe all context if user removes any file
    // (simplest + safest)
    return '';
  });
}

async function handleAttachmentSelect(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const files = Array.from(e.target.files || []);

  if (files.length === 0) return;

  if (files.length + attachments.length > 5) {
    alert('You can upload a maximum of 5 attachments.');
    return;
  }

  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} exceeds 5MB limit`);
      return;
    }
  }

  setAttachments(prev => [...prev, ...files]);

  await processAttachments(files);

  e.target.value = '';
}
async function processAttachments(files: File[]) {
  setIsProcessingAttachments(true);

  try {
    const extractedResults: string[] = [];

    for (const file of files) {
      const base64 = await fileToBase64(file);

      const result = await extractAttachmentWithGemini(
        file.type,
        base64
      );

    console.log(`📎 Extracted from ${file.name} (length=${result.length})`);
console.log(result);


      extractedResults.push(result);
    }

    const combinedContext = extractedResults.join('\n\n');

    setAttachmentContext(prev =>
      prev
        ? `${prev}\n\n${combinedContext}`
        : combinedContext
    );

  } catch (err) {
    console.error('Attachment extraction failed:', err);
  } finally {
    setIsProcessingAttachments(false);
  }
}

async function extractAttachmentWithGemini(
  mimeType: string,
  base64Data: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

 

 const body = {
  contents: [
    {
      parts: [
        {
          text: `
You are a document analysis and information extraction assistant.

TASK:
Extract ALL meaningful information from the attached file.

RULES:
- Do NOT summarize unless explicitly asked
- Preserve structure where possible
- Extract names, roles, organizations, timelines, facts, bullet points, tables (as text)
- If the document contains multiple sections or profiles, extract EACH ONE fully
- Be exhaustive and detailed
- Do NOT stop early
- Do NOT omit content for brevity
`
        },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.2,
    topK: 32,
    topP: 0.9,
    maxOutputTokens: 4096   // 🔴 THIS IS THE BIG FIX
  }
};


  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    'No extractable content found.'
  );
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

  function sanitizeSettings(settings: ConversationSettings): ConversationSettings {
    const cleaned = { ...settings };

    Object.keys(cleaned).forEach((key) => {
      if ((cleaned as any)[key] === undefined) {
        delete (cleaned as any)[key];
      }
    });

    return cleaned;
  }

  async function handleSettingsChange(newSettings: ConversationSettings) {
    const sanitized = sanitizeSettings(newSettings);
    setSettings(sanitized);

    try {
      await updateConversationSettings(conversationId, sanitized);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  const isBusy = videoState === 'thinking' || videoState === 'speaking';

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Video Call Active</span>
          {settings.language === 'hi' && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Hindi</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="max-w-2xl mx-auto">
            <VideoPlayer
              state={videoState}
              avatarImageUrl={settings.avatarPreviewImageUrl}
              speakingVideoUrl={currentVideoUrl} // For backward compatibility
              speakingVideoUrls={gooeyResponse?.videoUrls} // Pass array of video chunks
              caption={currentCaption}
              onVideoEnded={handleVideoEnded}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 px-6">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transcript</span>
              <span className="text-xs text-gray-400">{transcriptMessages.length} messages</span>
            </div>

            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              {transcriptMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full p-6">
                  <p className="text-sm text-gray-400 text-center">
                    Start speaking or type a message to begin the conversation
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {transcriptMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                          msg.sender === 'user'
                            ? 'bg-gray-900 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === 'user' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-6 pt-4">
          <div className="max-w-2xl mx-auto">
            {speechError && (
              <div className="mb-3 px-4 py-2 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-600">{speechError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
              <button
                onClick={toggleListening}
                disabled={isBusy}
                className={`flex-shrink-0 p-4 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
<input
  id="attachment-input"
  type="file"
  multiple
  accept="image/*,application/pdf,video/*,audio/*"
  hidden
  onChange={handleAttachmentSelect}
/>
{attachments.length > 0 && (
  <div className="mb-2 flex flex-wrap gap-2">
    {attachments.map((file, index) => (
      <div
        key={index}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs"
      >
        <span className="truncate max-w-[120px]">
          {file.name}
        </span>

        {isProcessingAttachments && (
          <span className="text-gray-400">processing…</span>
        )}

        <button
          onClick={() => removeAttachment(index)}
          className="text-gray-400 hover:text-red-500"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
placeholder={
  isListening
    ? 'Listening...'
    : attachments.length > 0
    ? `Message (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})`
    : 'Or type your message...'
}
                disabled={isBusy || isListening}
                className="flex-1 px-4 py-3 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
              />
<button
  onClick={() => document.getElementById('attachment-input')?.click()}
  disabled={isBusy || isProcessingAttachments}
  className="p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
  title="Add attachment"
>
  <Paperclip className="w-5 h-5" />
</button>

              <button
                onClick={handleSend}
disabled={
  !input.trim() ||
  isBusy ||
  isListening ||
  isProcessingAttachments
}
                className="flex-shrink-0 p-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              {isListening
                ? 'Speak now... your message will be sent automatically'
                : 'Press the microphone to speak or type your message'}
            </p>
          </div>
        </div>
      </div>

      {showSettings && (
        <AvatarSettingsPanel
          conversationId={conversationId}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}