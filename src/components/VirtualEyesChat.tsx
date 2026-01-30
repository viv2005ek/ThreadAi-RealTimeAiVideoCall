import { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Eye } from 'lucide-react';
import {
  Message,
  ConversationSettings,
  DEFAULT_CONVERSATION_SETTINGS,
  VisionContext
} from '../types';
import { subscribeToMessages, addMessage, subscribeToConversation, updateConversationSettings } from '../services/firestore';
import { generateAIResponse } from '../services/mockAI';
import { generateAvatarVideo, GooeyVideoResponse } from '../services/gooey';
import { processVisionSnapshot, loadObjectDetectionModel } from '../services/vision';
import AvatarSettingsPanel from './AvatarSettingsPanel';
import VideoPlayer, { VideoState } from './VideoPlayer';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageBubble from './MessageBubble';

interface VirtualEyesChatProps {
  conversationId: string;
}

export default function VirtualEyesChat({ conversationId }: VirtualEyesChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [videoState, setVideoState] = useState<VideoState>('idle');
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>(DEFAULT_CONVERSATION_SETTINGS);
  const [gooeyResponse, setGooeyResponse] = useState<GooeyVideoResponse | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const [visionContextHistory, setVisionContextHistory] = useState<VisionContext[]>([]);
  const [currentDetections, setCurrentDetections] = useState<Array<{ class: string; score: number; bbox: number[] }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadObjectDetectionModel();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
    });
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, (conv) => {
      if (conv?.settings) {
        setSettings(conv.settings);
      }
    });
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isCameraActive && videoRef.current && !isProcessingVision) {
      console.log('👁️ [LIVE VISION] Starting continuous object detection (every 2 seconds)...');

      intervalId = setInterval(async () => {
        if (!isProcessingVision && videoRef.current && isCameraActive) {
          console.log('👁️ [LIVE VISION] Updating detections...');

          if (!videoRef.current || !canvasRef.current) return;

          const canvas = canvasRef.current;
          const video = videoRef.current;

          if (video.videoWidth === 0 || video.videoHeight === 0) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          try {
            const visionContext = await processVisionSnapshot(canvas);
            setCurrentDetections(visionContext.objects);
          } catch (error) {
            console.error('❌ [LIVE VISION] Error updating detections:', error);
          }
        }
      }, 2000);
    }

    return () => {
      if (intervalId) {
        console.log('👁️ [LIVE VISION] Stopping continuous object detection');
        clearInterval(intervalId);
      }
    };
  }, [isCameraActive, isProcessingVision]);

  useEffect(() => {
    console.log('📹 [CAMERA STATE] isCameraActive changed to:', isCameraActive);
    console.log('📹 [CAMERA STATE] videoRef.current exists:', !!videoRef.current);
    console.log('📹 [CAMERA STATE] streamRef.current exists:', !!streamRef.current);
    if (videoRef.current) {
      console.log('📹 [CAMERA STATE] video srcObject:', videoRef.current.srcObject);
      console.log('📹 [CAMERA STATE] video paused:', videoRef.current.paused);
      console.log('📹 [CAMERA STATE] video readyState:', videoRef.current.readyState);
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      console.log('🔄 [ASSIGN STREAM] Video element is now mounted! Assigning stream...');
      console.log('🔄 [ASSIGN STREAM] videoRef.current:', videoRef.current);
      console.log('🔄 [ASSIGN STREAM] streamRef.current:', streamRef.current);

      videoRef.current.srcObject = streamRef.current;

      videoRef.current.onloadedmetadata = () => {
        console.log('🎬 [VIDEO METADATA] Metadata loaded!');
        console.log('🎬 [VIDEO METADATA] Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        console.log('🎬 [VIDEO METADATA] Video readyState:', videoRef.current?.readyState);
      };

      videoRef.current.oncanplay = () => {
        console.log('▶️ [VIDEO CANPLAY] Video can play now');
      };

      videoRef.current.onplay = () => {
        console.log('✅ [VIDEO PLAYING] Video is now playing!');
      };

      videoRef.current.onerror = (e) => {
        console.error('❌ [VIDEO ERROR] Video element error:', e);
      };

      console.log('🔄 [ASSIGN STREAM] Stream assigned to video element!');
    }
  }, [isCameraActive, videoRef.current, streamRef.current]);

  async function startCamera() {
    try {
      console.log('🎥 [START CAMERA] Button clicked - requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('🎥 [START CAMERA] Stream obtained:', stream);
      console.log('🎥 [START CAMERA] Video tracks:', stream.getVideoTracks());
      console.log('🎥 [START CAMERA] Track enabled:', stream.getVideoTracks()[0]?.enabled);
      console.log('🎥 [START CAMERA] Track readyState:', stream.getVideoTracks()[0]?.readyState);

      console.log('🎥 [START CAMERA] Storing stream in streamRef...');
      streamRef.current = stream;

      console.log('🎥 [START CAMERA] Setting isCameraActive to true (video element will now render)...');
      setIsCameraActive(true);
      console.log('✅ [START CAMERA] State updated! Video element should render now.');
    } catch (error) {
      console.error('❌ [START CAMERA] Failed to get camera stream:', error);
      alert('Failed to access camera. Please check permissions and ensure you are using HTTPS.');
    }
  }

  function stopCamera() {
    console.log('🛑 [STOP CAMERA] Stopping camera...');
    if (streamRef.current) {
      console.log('🛑 [STOP CAMERA] Stopping all tracks...');
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 [STOP CAMERA] Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      console.log('🛑 [STOP CAMERA] Clearing video srcObject...');
      videoRef.current.srcObject = null;
    }
    console.log('🛑 [STOP CAMERA] Clearing detections and setting isCameraActive to false');
    setCurrentDetections([]);
    setIsCameraActive(false);
  }

  async function captureAndProcessVision(): Promise<VisionContext | null> {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      console.log('Vision capture skipped - camera not active or refs not ready');
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not ready yet');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Failed to get canvas context');
      return null;
    }

    console.log('🎨 [CANVAS] Capturing frame with UN-MIRRORED image for processing...');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    console.log('🎨 [CANVAS] Frame captured:', canvas.width, 'x', canvas.height);

    setIsProcessingVision(true);
    try {
      const visionContext = await processVisionSnapshot(canvas);
      console.log('✅ [VISION] Processing complete');

      setCurrentDetections(visionContext.objects);
      console.log('🎯 [DETECTIONS] Stored', visionContext.objects.length, 'objects for bounding box display');

      return visionContext;
    } catch (error) {
      console.error('❌ [VISION] Failed to process:', error);
      return null;
    } finally {
      setIsProcessingVision(false);
    }
  }

  async function handleSendMessage() {
    if (!input.trim() || videoState === 'speaking' || videoState === 'thinking') return;

    const userMessage = input.trim();
    setInput('');

    await addMessage({
      conversationId,
      sender: 'user',
      text: userMessage,
      createdAt: new Date()
    });

    setVideoState('thinking');

    try {
      const visionContext = await captureAndProcessVision();

      let contextWindow = '';
      if (visionContextHistory.length > 0) {
        contextWindow = visionContextHistory.map(vc =>
          `[${vc.timestamp.toLocaleTimeString()}] ${vc.description}`
        ).join('\n');
      }

      if (visionContext) {
        setVisionContextHistory(prev => [...prev, visionContext].slice(-10));
        contextWindow += contextWindow ? '\n' : '';
        contextWindow += `[Current view - ${visionContext.timestamp.toLocaleTimeString()}] ${visionContext.description}`;
        console.log('Vision context added to prompt:', visionContext.description);
      } else {
        console.log('No vision context captured');
      }

      let detailedVisionData = '';
      if (visionContext && visionContext.detailedAnalysis) {
        detailedVisionData = visionContext.detailedAnalysis;
      }

      const systemPrompt = contextWindow
        ? `IMPORTANT: You are an AI assistant with LIVE CAMERA ACCESS powered by TensorFlow COCO-SSD for object detection and Tesseract OCR for text recognition. You can SEE and ANALYZE the user's surroundings in real-time.

DETAILED VISION ANALYSIS (Current Frame):
${detailedVisionData}

RECENT VISION HISTORY:
${contextWindow}

USER'S QUESTION: "${userMessage}"

INSTRUCTIONS:
- Answer based on the DETAILED VISION ANALYSIS above, which includes:
  * Detected objects with confidence scores
  * Bounding box positions and sizes
  * Depth ordering (foreground/background)
  * Spatial positions (left/center/right)
  * Any visible text extracted via OCR
- Be specific about object types, positions, and confidence levels
- If asked about "what's in my hand", focus on foreground objects (very close/close depth)
- Reference the actual detection data in your response
- If no objects detected, state this clearly
- Always ground your answers in the vision data provided`
        : userMessage;

      console.log('Sending prompt to AI with vision context:', contextWindow ? 'YES' : 'NO');

      const responseText = await generateAIResponse(
        systemPrompt,
        settings,
        messages
      );

      setCurrentCaption(responseText);

      function prepareTextForVideo(text: string): string {
        const cleaned = text.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
        if (!/[.!?।]$/.test(cleaned)) {
          return cleaned + '।';
        }
        return cleaned;
      }

      const safeText = prepareTextForVideo(responseText);

      const gooeyResponseResult = await generateAvatarVideo({
        text: safeText,
        language: settings.language,
        avatarUrl: settings.avatarMediaUrl,
        gender: settings.avatarVoiceGender
      });

      setGooeyResponse(gooeyResponseResult);

      await addMessage({
        conversationId,
        sender: 'ai',
        text: responseText,
        transcript: responseText,
        videoUrl: gooeyResponseResult.videoUrl,
        videoUrls: gooeyResponseResult.videoUrls,
        createdAt: new Date(),
        visionContext: visionContext || undefined
      });

      if (gooeyResponseResult.success && (gooeyResponseResult.videoUrls?.length || gooeyResponseResult.videoUrl)) {
        if (gooeyResponseResult.videoUrl) setCurrentVideoUrl(gooeyResponseResult.videoUrl);
        setVideoState('speaking');
      } else {
        setVideoState('idle');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setVideoState('idle');
      setCurrentCaption('');
      setCurrentVideoUrl(null);
      setGooeyResponse(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleVideoEnd() {
    setVideoState('idle');
    setCurrentCaption('');
    setCurrentVideoUrl(null);
    setGooeyResponse(null);
  }

  async function handleSettingsSave(newSettings: ConversationSettings) {
    await updateConversationSettings(conversationId, newSettings);
    setSettings(newSettings);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 relative z-10">
      <ChatHeader
        settings={settings}
        onSettingsClick={() => setShowSettings(true)}
      />

      {showSettings && (
        <AvatarSettingsPanel
          conversationId={conversationId}
          settings={settings}
          onSettingsChange={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-cyan-500/20">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow border border-violet-500/30">
                    <Eye className="w-8 h-8 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 heading-font">Virtual Eyes Mode</h3>
                  <p className="text-slate-400 mb-4">AI can see and understand your surroundings through the camera</p>

                  {(() => {
                    console.log('💬 [EMPTY STATE] Rendering status message - isCameraActive:', isCameraActive);
                    return !isCameraActive ? (
                      <div className="mt-6 p-4 glass-effect border border-amber-500/30 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-amber-400 font-medium mb-2">📷 Camera is currently off</p>
                        <p className="text-xs text-amber-300/80">Click "Start Camera" in the top right to enable AI vision</p>
                      </div>
                    ) : (
                      <div className="mt-6 p-4 glass-effect border border-cyan-500/30 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-cyan-400 font-medium mb-2">✅ Camera Active</p>
                        <p className="text-xs text-cyan-300/80">AI can now see what's in front of your camera. Ask me anything!</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-cyan-500/20 glass-darker">
            <MessageInput
              input={input}
              onInputChange={setInput}
              onSend={handleSendMessage}
              onKeyDown={handleKeyDown}
              isBusy={videoState === 'speaking' || videoState === 'thinking'}
              isListening={false}
              onToggleListening={() => {}}
              speechError={null}
              attachments={[]}
              onAttachmentSelect={() => {}}
              onRemoveAttachment={() => {}}
              isProcessingAttachments={isProcessingVision}
            />
          </div>
        </div>

        <div className="w-[500px] glass-darker flex flex-col relative border-l border-cyan-500/20">
          <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white heading-font">AI Assistant</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Camera: {isCameraActive ? '🟢 Active' : '🔴 Inactive'}
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔘 [BUTTON] Camera button clicked! Current state:', isCameraActive);
                if (isCameraActive) {
                  stopCamera();
                } else {
                  startCamera();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isCameraActive
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg hover:shadow-red-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:neon-glow'
              }`}
            >
              {isCameraActive ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            <VideoPlayer
              state={videoState}
              avatarImageUrl={settings.avatarPreviewImageUrl}
              speakingVideoUrl={currentVideoUrl}
              speakingVideoUrls={gooeyResponse?.videoUrls || []}
              caption={currentCaption}
              onVideoEnded={handleVideoEnd}
            />
          </div>

          {(() => {
            console.log('🖼️ [RENDER] Camera preview conditional render check - isCameraActive:', isCameraActive);
            return isCameraActive && (
              <div className="absolute bottom-6 right-6 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-2xl border-4 border-green-500 z-10">
                {console.log('🖼️ [RENDER] Camera preview div is rendering!')}
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    onLoadStart={() => console.log('🖼️ [VIDEO] onLoadStart event')}
                    onLoadedData={() => console.log('🖼️ [VIDEO] onLoadedData event')}
                    onPlay={() => console.log('🖼️ [VIDEO] onPlay event')}
                    onCanPlay={() => console.log('🖼️ [VIDEO] onCanPlay event')}
                  />

                  {currentDetections.length > 0 && videoRef.current && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ transform: 'scaleX(-1)' }}
                      viewBox={`0 0 ${videoRef.current.videoWidth || 1280} ${videoRef.current.videoHeight || 720}`}
                      preserveAspectRatio="none"
                    >
                      {currentDetections.map((obj, idx) => {
                        const [x, y, width, height] = obj.bbox;
                        const confidence = Math.round(obj.score * 100);

                        let color = '#22c55e';
                        const area = width * height;
                        if (area > 50000) color = '#ef4444';
                        else if (area > 30000) color = '#f59e0b';
                        else if (area > 10000) color = '#3b82f6';

                        return (
                          <g key={idx}>
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill="none"
                              stroke={color}
                              strokeWidth="3"
                              strokeDasharray="5,5"
                            />
                            <rect
                              x={x}
                              y={y - 22}
                              width={Math.max(obj.class.length * 8 + 35, 80)}
                              height="22"
                              fill={color}
                              opacity="0.9"
                            />
                            <text
                              x={x + 4}
                              y={y - 6}
                              fill="white"
                              fontSize="12"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {obj.class} {confidence}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {isProcessingVision && (
                    <div className="absolute inset-0 bg-blue-600/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4 animate-pulse" />
                        <span>Analyzing Vision...</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-black/80 rounded text-xs text-white font-medium">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span>Your Camera (Live)</span>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                    <div className="px-2 py-1 bg-green-600/90 rounded text-xs text-white font-medium">
                      AI Vision Active
                    </div>
                    {currentDetections.length > 0 && (
                      <div className="px-2 py-1 bg-blue-600/90 rounded text-xs text-white font-medium">
                        {currentDetections.length} object{currentDetections.length !== 1 ? 's' : ''} detected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
