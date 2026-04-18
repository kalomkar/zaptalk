import React, { useState } from 'react';
import { Message, UserProfile } from '../types';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { decryptMessage } from '../lib/encryption';
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
  Clock 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  chatId: string;
  otherUser: UserProfile | null;
  profile: UserProfile | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  showAvatar, 
  chatId, 
  otherUser, 
  profile 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const decryptedText = message.isEncrypted ? decryptMessage(message.text) : message.text;
  const isAI = message.senderId === 'ai-assistant';

  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        isDeleted: true,
        text: 'This message was deleted'
      });
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
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
    "relative px-3 py-2 shadow-sm group",
    bubbleStyle === 'sleek' && (isOwn ? "rounded-2xl rounded-br-none" : "rounded-2xl rounded-bl-none"),
    bubbleStyle === 'rounded' && "rounded-3xl",
    bubbleStyle === 'sharp' && "rounded-none",
    isOwn 
      ? "bg-bubble-sent text-white" 
      : isAI 
        ? "bg-sidebar-accent text-foreground border border-accent-primary/20"
        : "bg-bubble-received text-foreground",
    message.isDeleted && "italic opacity-50"
  );

  const showReadReceipts = !otherUser?.settings?.privacy.hideReadReceipts;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-1",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[80%] md:max-w-[70%] gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8 mt-1 shrink-0">
            <AvatarImage src={isAI ? "" : otherUser?.photoURL} />
            <AvatarFallback className={cn(isAI ? "bg-emerald-500 text-white" : "bg-zinc-800")}>
              {isAI ? <Bot className="w-4 h-4" /> : otherUser?.displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-8" />}

        <div className="flex flex-col">
          <DropdownMenu>
            <DropdownMenuTrigger 
              className={bubbleClasses}
              style={isOwn ? { backgroundColor: primaryColor } : {}}
            >
              {message.isEncrypted && !message.isDeleted && (
                  <div className="absolute -top-2 -right-2 bg-background p-1 rounded-full border border-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Shield className="w-3 h-3 text-accent-primary" />
                  </div>
                )}

                {message.isDeleted ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  <>
                    {isAI && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="bg-accent-primary/10 text-accent-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" />
                          Meta AI
                        </div>
                      </div>
                    )}
                    {message.type === 'image' && message.fileUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                        <img 
                          src={message.fileUrl} 
                          alt="Sent image" 
                          className="max-w-full h-auto object-cover max-h-60 cursor-pointer"
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(message.fileUrl, '_blank')}
                        />
                      </div>
                    )}

                    {message.type === 'voice' && (
                      <div className="flex items-center gap-3 min-w-[200px] mb-1">
                        <button 
                          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                          onClick={toggleVoiceNote}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-1/3" />
                        </div>
                        <span className="text-[10px]">Voice</span>
                      </div>
                    )}

                    {message.type === 'file' && (
                      <div className="flex items-center gap-3 p-2 mb-2 bg-black/20 rounded-lg border border-white/5">
                        <div className="p-2 bg-emerald-500/20 rounded-md">
                          <FileIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{message.fileName}</p>
                          <p className="text-[10px] opacity-50">{(message.fileSize || 0) / 1024 > 1024 ? `${((message.fileSize || 0) / 1024 / 1024).toFixed(1)} MB` : `${((message.fileSize || 0) / 1024).toFixed(1)} KB`}</p>
                        </div>
                        <a href={message.fileUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-white/10 rounded">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {decryptedText}
                    </p>
                  </>
                )}

                <div className={cn(
                  "flex items-center justify-end gap-1 mt-1",
                  isOwn ? "text-white/60" : "text-text-dim"
                )}>
                  <span className="text-[10px] font-medium">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                  {isOwn && !message.isDeleted && (
                    <div className="flex">
                      {message.status === 'sent' && <Check className="w-3 h-3" />}
                      {(message.status === 'delivered' || (message.status === 'seen' && !showReadReceipts)) && <CheckCheck className="w-3 h-3" />}
                      {message.status === 'seen' && showReadReceipts && <CheckCheck className="w-3 h-3 text-blue-400" />}
                    </div>
                  )}
                  {message.scheduledFor && (
                    <Clock className="w-3 h-3 opacity-70" />
                  )}
                </div>
              </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="bg-sidebar border-sidebar-border">
              {isOwn && !message.isDeleted && (
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete for everyone
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={() => {
                navigator.clipboard.writeText(decryptedText);
                toast.success('Copied to clipboard');
              }}>
                Copy text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};
