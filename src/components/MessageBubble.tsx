import React, { useState } from 'react';
import { Message, UserProfile } from '../types';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { encryptMessage, decryptMessage } from '../lib/encryption';
import { 
  Check, 
  CheckCheck, 
  FileIcon, 
  Download, 
  Bot, 
  Shield, 
  Play, 
  Pause, 
  Trash2, 
  Clock,
  Star,
  Forward,
  Reply,
  Smile,
  Info,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  chatId: string;
  otherUser: UserProfile | null;
  profile: UserProfile | null;
  onReply?: (msg: Message) => void;
  onReact?: (emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ 
  message, 
  isOwn, 
  showAvatar, 
  chatId, 
  otherUser, 
  profile,
  onReply,
  onReact
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Anti-Delete Logic
  const canSeeDeleted = profile?.settings?.privacy.antiDelete;
  const isActuallyDeleted = message.isDeleted;
  const showDeletedNotice = isActuallyDeleted && !canSeeDeleted;
  const showAntiDeleteContent = isActuallyDeleted && canSeeDeleted;

  const decryptedText = message.isEncrypted ? decryptMessage(message.text) : message.text;
  const isAI = message.senderId === 'ai-assistant';
  const isStarred = message.isStarred?.[auth.currentUser?.uid || ''];

  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        isDeleted: true,
        deletedContent: decryptedText, // Store original for anti-delete
        text: encryptMessage('🚫 This message was deleted')
      });
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleToggleStar = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        [`isStarred.${uid}`]: !isStarred
      });
    } catch (error) {
      toast.error('Failed to star message');
    }
  };

  const toggleVoiceNote = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(message.fileUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const bubbleStyle = profile?.settings?.customization.bubbleStyle || 'sleek';
  const primaryColor = profile?.settings?.customization.primaryColor || '#00a884';

  const bubbleClasses = cn(
    "relative px-4 py-2.5 shadow-sm group transition-all duration-300",
    bubbleStyle === 'sleek' && (isOwn ? "rounded-2xl rounded-tr-none" : "rounded-2xl rounded-tl-none"),
    bubbleStyle === 'rounded' && "rounded-3xl",
    bubbleStyle === 'sharp' && "rounded-none",
    isOwn 
      ? "bg-bubble-sent text-white shadow-[0_2px_8px_-2px_rgba(0,168,132,0.3)]" 
      : isAI 
        ? "glass border border-accent-primary/20 text-foreground"
        : "bg-bubble-received text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]",
    message.isDeleted && "italic opacity-50"
  );

  const showReadReceipts = !otherUser?.settings?.privacy.hideReadReceipts;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] md:max-w-[70%] gap-3 items-end",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        {!isOwn && (
          <Avatar className="w-8 h-8 shrink-0 mb-1 ring-1 ring-white/10">
            <AvatarImage src={isAI ? "https://api.dicebear.com/7.x/bottts/svg?seed=ZapTalk&variant=pixel" : otherUser?.photoURL} />
            <AvatarFallback className={cn(isAI ? "bg-accent-primary text-black" : "bg-sidebar-accent text-text-dim lowercase font-black")}>
              {isAI ? <Bot className="w-4 h-4" /> : otherUser?.displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex flex-col gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger 
              className={cn(
                bubbleClasses,
                "outline-none text-left"
              )}
              style={isOwn ? { backgroundColor: primaryColor } : {}}
            >
              {message.isEncrypted && !isActuallyDeleted && (
                  <div className="absolute -top-2 -right-2 bg-sidebar border border-white/5 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-premium">
                    <Shield className="w-3 h-3 text-accent-primary" />
                  </div>
                )}

                {isStarred && (
                   <div className="absolute -top-2 -left-2 bg-sidebar border border-white/5 p-1 rounded-full shadow-premium">
                     <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                   </div>
                )}

                {showDeletedNotice ? (
                  <div className="flex items-center gap-2 text-[13px] opacity-70">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  <>
                    {showAntiDeleteContent && (
                       <div className="flex items-center gap-2 mb-2 bg-rose-500/20 text-rose-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest self-start border border-rose-500/20">
                          <Info className="w-2.5 h-2.5" />
                          Anti-Delete Intercepted
                       </div>
                    )}
                    {isAI && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-accent-primary/20 text-accent-primary text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-accent-primary/20">
                          <Zap className="w-2.5 h-2.5 fill-accent-primary animate-pulse" />
                          GPT-4o Vision
                        </div>
                      </div>
                    )}
                    
                    {/* Reply Preview in Bubble */}
                    {message.replyTo && (
                      <div className="mb-2 p-2 bg-black/10 rounded-xl border-l-[3px] border-accent-primary/50 text-[11px] opacity-80 italic truncate max-w-full backdrop-blur-sm self-start">
                        {message.replyTo.text.length > 50 ? message.replyTo.text.slice(0, 50) + '...' : message.replyTo.text}
                      </div>
                    )}

                    {message.type === 'image' && message.fileUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-white/10 shadow-premium group/image relative">
                        <img 
                          src={message.fileUrl} 
                          alt="Sent content" 
                          className="max-w-full h-auto object-cover max-h-[400px] cursor-pointer hover:scale-[1.02] transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(message.fileUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex items-end p-3">
                           <Download className="w-5 h-5 text-white cursor-pointer hover:text-accent-primary transition-colors" />
                        </div>
                      </div>
                    )}

                    {message.type === 'voice' && (
                      <div className={cn(
                        "flex items-center gap-4 min-w-[240px] mb-1.5 p-1 rounded-2xl",
                        isOwn ? "bg-white/10" : "bg-black/10"
                      )}>
                        <button 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-premium shrink-0",
                            isOwn ? "bg-white text-black" : "bg-accent-primary text-black"
                          )}
                          onClick={toggleVoiceNote}
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        <div className="flex-1 flex flex-col gap-1.5">
                           <div className="flex gap-0.5 items-end h-6">
                              {[...Array(24)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "w-1 rounded-full transition-all duration-300",
                                    isOwn ? "bg-white/40" : "bg-accent-primary/40",
                                    isPlaying ? "animate-pulse" : ""
                                  )}
                                  style={{ 
                                    height: `${20 + Math.random() * 80}%`,
                                    opacity: 0.3 + (i / 24) * 0.7
                                  }} 
                                />
                              ))}
                           </div>
                           <div className="flex justify-between items-center text-[9px] opacity-60 font-black uppercase tracking-widest">
                              <span>0:42</span>
                              <span>Voice Capsule</span>
                           </div>
                        </div>
                      </div>
                    )}

                    {message.type === 'file' && (
                      <div className="flex items-center gap-4 p-3 mb-2 bg-black/10 rounded-2xl border border-white/5 backdrop-blur-sm group/file hover:bg-black/20 transition-all">
                        <div className="w-11 h-11 bg-accent-primary/10 rounded-xl flex items-center justify-center group-hover/file:scale-110 transition-transform">
                          <FileIcon className="w-6 h-6 text-accent-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate tracking-tight">{message.fileName}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-0.5">
                            {(message.fileSize || 0) / 1024 > 1024 
                              ? `${((message.fileSize || 0) / 1024 / 1024).toFixed(1)} MB` 
                              : `${((message.fileSize || 0) / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                        <a href={message.fileUrl} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all active:scale-90">
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    )}

                    <p className="text-[15px] leading-[1.6] whitespace-pre-wrap break-words font-medium">
                      {showAntiDeleteContent ? (message.deletedContent || decryptedText) : decryptedText}
                    </p>
                  </>
                )}

                <div className={cn(
                  "flex items-center justify-end gap-1.5 mt-2",
                  isOwn ? "text-white/60" : "text-text-dim"
                )}>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                  {isOwn && !isActuallyDeleted && (
                    <div className="flex items-center">
                      {message.status === 'sent' && <Check className="w-3.5 h-3.5 text-white/50" />}
                      {(message.status === 'delivered' || (message.status === 'seen' && !showReadReceipts)) && <CheckCheck className="w-3.5 h-3.5 text-white/50" />}
                      {message.status === 'seen' && showReadReceipts && <CheckCheck className="w-3.5 h-3.5 text-accent-primary drop-shadow-[0_0_5px_rgba(0,230,118,0.5)]" />}
                    </div>
                  )}
                  {message.scheduledFor && (
                    <div className="bg-white/10 rounded-full p-1 ml-1">
                      <Clock className="w-3 h-3 text-accent-primary" />
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="bg-sidebar border-sidebar-border w-56 p-1">
              <div className="flex items-center justify-around p-2 border-b border-sidebar-border mb-1">
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => onReact?.(emoji)}
                    className="hover:scale-125 transition-transform p-1 rounded-md hover:bg-sidebar-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onReply?.(message)}>
                <Reply className="w-4 h-4" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleToggleStar}>
                <Star className={cn("w-4 h-4", isStarred && "fill-amber-500 text-amber-500")} /> {isStarred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer gap-2" 
                onClick={() => {
                   navigator.clipboard.writeText(decryptedText);
                   toast.success('Copied to clipboard');
                }}
              >
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2">
                <Forward className="w-4 h-4" /> Forward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isOwn && !isActuallyDeleted && (
                <DropdownMenuItem className="text-destructive cursor-pointer gap-2" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" /> Delete for everyone
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};
