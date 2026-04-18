import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDoc,
  getDocs,
  limit,
  setDoc,
  deleteDoc,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Message, Chat, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  MoreVertical, 
  Phone, 
  Video, 
  Zap, 
  Loader2, 
  Square,
  Calendar,
  Clock,
  Bot,
  Image as ImageIcon,
  File as FileIcon,
  X
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { encryptMessage, decryptMessage } from '../lib/encryption';
import { MessageBubble } from './MessageBubble';
import { generateAIResponse, generateReplySuggestions } from '../services/aiService';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  chatId: string;
  localChat?: any;
}

import { useUser } from '../context/UserContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export default function ChatWindow({ chatId, localChat }: ChatWindowProps) {
  const { profile } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId) return;

    if (chatId?.startsWith('local_') && localChat) {
      setChat(localChat);
      setOtherUser({
        uid: localChat.participants[1],
        displayName: localChat.name,
        photoURL: localChat.avatar,
        email: '',
        status: 'online',
        lastSeen: Date.now()
      });
      setMessages([localChat.lastMessage]);
      setLoading(false);
      return;
    }

    // Fetch chat metadata
    const chatDocRef = doc(db, 'chats', chatId);
    const chatUnsubscribe = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
        setChat(chatData);

        // Fetch other user profile
        const otherId = chatData.participants.find(p => p !== auth.currentUser?.uid);
        if (otherId === 'ai-assistant') {
          setOtherUser({
            uid: 'ai-assistant',
            displayName: 'Meta AI',
            email: 'ai@meta.com',
            photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=MetaAI',
            status: 'online',
            lastSeen: Date.now()
          });
        } else if (otherId) {
          const userSnap = await getDoc(doc(db, 'users', otherId));
          if (userSnap.exists()) {
            setOtherUser(userSnap.data() as UserProfile);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    // Fetch messages
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const messagesUnsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Ensure timestamp is a number for sorting and keys
        timestamp: (doc.data() as any).timestamp?.toMillis ? (doc.data() as any).timestamp.toMillis() : (doc.data() as any).timestamp
      } as Message));
      setMessages(msgs);
      setLoading(false);
      
      // Mark messages as seen and update chat metadata
      const unreadMsgs = msgs.filter(msg => msg.senderId !== auth.currentUser?.uid && msg.status !== 'seen');
      if (unreadMsgs.length > 0) {
        (async () => {
          unreadMsgs.forEach(async (msg) => {
            try {
              // Use setDoc with merge: true to avoid "No document to update" errors
              await setDoc(doc(db, 'chats', chatId, 'messages', msg.id), { status: 'seen' }, { merge: true });
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}/messages/${msg.id}`);
            }
          });
          
          // Reset unread count for current user
          try {
            await updateDoc(doc(db, 'chats', chatId), {
              [`unreadCount.${auth.currentUser?.uid}`]: 0,
              'lastMessage.status': 'seen'
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}`);
          }
        })();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => {
      chatUnsubscribe();
      messagesUnsubscribe();
    };
  }, [chatId, localChat]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages, isTypingAI, suggestions]);

  // AI Auto Reply Logic
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (
      profile?.settings?.aiAutoReplyEnabled &&
      lastMsg &&
      lastMsg.senderId !== auth.currentUser?.uid &&
      lastMsg.type === 'text' &&
      !lastMsg.id?.startsWith('temp_') && // Don't reply to temporary messages
      otherUser?.uid !== 'ai-assistant' // Don't auto-reply to the AI assistant
    ) {
      const autoReply = async () => {
        // Check if we already replied to this message
        const alreadyReplied = messages.some(m => m.senderId === auth.currentUser?.uid && m.timestamp > lastMsg.timestamp);
        if (alreadyReplied) return;

        setIsTypingAI(true);
        const text = decryptMessage(lastMsg.text || '');
        const aiResponse = await generateAIResponse(text);
        
        // Add a delay to simulate typing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const aiMessage = {
          senderId: auth.currentUser?.uid,
          text: aiResponse,
          timestamp: Date.now(),
          type: 'text' as const,
          status: 'sent' as const,
          isEncrypted: false
        };

        if (chatId && !chatId.startsWith('local_')) {
          const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), aiMessage);
          
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
              id: msgRef.id,
              senderId: auth.currentUser?.uid,
              text: aiResponse,
              timestamp: aiMessage.timestamp,
              type: 'text',
              status: 'sent',
              isEncrypted: false
            },
            [`unreadCount.${otherUser?.uid}`]: (chat?.unreadCount?.[otherUser?.uid || ''] || 0) + 1,
            updatedAt: Date.now()
          });
        }
        setIsTypingAI(false);
      };
      
      const timeout = setTimeout(autoReply, 3000);
      return () => clearTimeout(timeout);
    }
  }, [messages, profile?.settings?.aiAutoReplyEnabled, otherUser]);

  // AI Reply Suggestions Logic
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (
      profile?.settings?.aiSuggestionsEnabled &&
      lastMsg &&
      lastMsg.senderId !== auth.currentUser?.uid &&
      lastMsg.type === 'text'
    ) {
      const getSuggestions = async () => {
        setLoadingSuggestions(true);
        const text = decryptMessage(lastMsg.text || '');
        const newSuggestions = await generateReplySuggestions(text);
        setSuggestions(newSuggestions);
        setLoadingSuggestions(false);
      };
      getSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [messages, profile?.settings?.aiSuggestionsEnabled, auth.currentUser]);
  const handleTyping = async (isTypingStatus: boolean) => {
    if (!auth.currentUser || !chatId || chatId.startsWith('local_') || profile?.settings?.privacy.hideTypingStatus) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${auth.currentUser.uid}`]: isTypingStatus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}`);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleTyping(inputText.length > 0);
    }, 500);

    return () => clearTimeout(timeout);
  }, [inputText]);

  // Clear typing status on unmount or chat change
  useEffect(() => {
    return () => {
      if (auth.currentUser && chatId && !chatId.startsWith('local_')) {
        updateDoc(doc(db, 'chats', chatId), {
          [`typing.${auth.currentUser.uid}`]: false
        });
      }
    };
  }, [chatId]);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [scheduledTime, setScheduledTime] = useState<number | null>(null);

  const handleSendMessage = async (e?: React.FormEvent, type: Message['type'] = 'text', file?: { url: string, name: string, size: number }) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && type === 'text' && !file) return;
    if (!auth.currentUser || !chatId) return;

    setInputText('');
    handleTyping(false);

    try {
      const messageData: any = {
        senderId: auth.currentUser.uid,
        text: type === 'text' ? encryptMessage(textToSend) : '',
        timestamp: Date.now(),
        type,
        status: 'sent',
        isEncrypted: type === 'text'
      };

      if (scheduledTime) {
        messageData.scheduledFor = scheduledTime;
      }

      if (file) {
        messageData.fileUrl = file.url;
        messageData.fileName = file.name;
        messageData.fileSize = file.size;
      }

      // 1. Update/Create chat metadata first (to ensure isParticipant check passes in rules)
      const chatUpdate: any = {
        lastMessage: { 
          senderId: auth.currentUser.uid,
          text: type === 'text' ? textToSend : `Sent a ${type}`,
          timestamp: Date.now(),
          type,
          status: 'sent',
          isEncrypted: type === 'text'
        },
        [`unreadCount.${otherUser?.uid}`]: (chat?.unreadCount?.[otherUser?.uid || ''] || 0) + 1,
        updatedAt: Date.now()
      };

      if (chatId?.startsWith('local_') || !chat) {
        chatUpdate.participants = chat?.participants || [auth.currentUser.uid, otherUser?.uid || ''];
        chatUpdate.type = chat?.type || 'one-to-one';
        if (otherUser?.displayName) chatUpdate.name = otherUser.displayName;
        if (otherUser?.photoURL) chatUpdate.avatar = otherUser.photoURL;
      }

      await setDoc(doc(db, 'chats', chatId), chatUpdate, { merge: true });

      // 2. Add the message to the subcollection
      const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // 3. Update the chat with the real message ID
      await updateDoc(doc(db, 'chats', chatId), {
        'lastMessage.id': msgRef.id
      });

      setScheduledTime(null);

      // AI Assistant Trigger
      if (textToSend.toLowerCase().startsWith('@ai') || otherUser?.uid === 'ai-assistant') {
        const prompt = textToSend.replace('@ai', '').trim();
        handleAIResponse(prompt);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
      toast.error('Failed to send message');
    }
  };

  const handleAIResponse = async (prompt: string) => {
    setIsTypingAI(true);
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const aiText = await generateAIResponse(prompt);
    
    const aiMessage = {
      senderId: 'ai-assistant',
      text: aiText,
      timestamp: Date.now(),
      type: 'ai',
      status: 'sent',
      isEncrypted: false
    };

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), aiMessage);
    
    // Sync chat metadata for AI response
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: {
        id: msgRef.id,
        senderId: 'ai-assistant',
        text: aiText,
        timestamp: aiMessage.timestamp,
        type: 'ai',
        status: 'sent',
        isEncrypted: false
      },
      [`unreadCount.${auth.currentUser?.uid}`]: (chat?.unreadCount?.[auth.currentUser?.uid || ''] || 0) + 1,
      updatedAt: Date.now()
    });
    
    setIsTypingAI(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !auth.currentUser) return;

    setUploading(true);
    try {
      // Support multiple files (up to 90 as requested)
      const uploadPromises = Array.from(files).slice(0, 90).map(async (file: File) => {
        const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        const messageData = {
          senderId: auth.currentUser!.uid,
          text: `Sent a ${file.type?.startsWith('image/') ? 'photo' : 'file'}`,
          timestamp: Date.now(),
          type: file.type?.startsWith('image/') ? 'image' : (file.type?.startsWith('video/') ? 'video' : 'file'),
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
          status: 'sent',
          isEncrypted: false
        };

        return addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error(error);
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const file = new File([blob], 'voice_note.ogg', { type: 'audio/ogg' });
        
        setUploading(true);
        try {
          const storageRef = ref(storage, `voice_notes/${chatId}/${Date.now()}.ogg`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          handleSendMessage(undefined, 'voice', { url, name: 'Voice Note', size: blob.size });
        } catch (error) {
          toast.error('Failed to upload voice note');
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleClearChat = async () => {
    if (!chatId || chatId?.startsWith('local_')) return;
    try {
      const q = query(collection(db, 'chats', chatId, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Update last message in chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: deleteField()
      });
      
      toast.success('Chat cleared');
    } catch (error) {
      toast.error('Failed to clear chat');
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || chatId?.startsWith('local_')) return;
    try {
      await handleClearChat();
      await deleteDoc(doc(db, 'chats', chatId));
      toast.success('Chat deleted');
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-[60px] p-4 flex items-center justify-between border-b border-sidebar-border bg-sidebar sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-sidebar-border">
            <AvatarImage src={chat?.type === 'group' ? chat.avatar : otherUser?.photoURL} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400">{chat?.type === 'group' ? chat.name?.charAt(0) : otherUser?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-[15px] text-foreground">{chat?.type === 'group' ? chat.name : otherUser?.displayName}</h2>
            <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
              {otherUser?.status === 'online' ? (
                <>
                  <span className="w-2.5 h-2.5 bg-accent-primary rounded-full" />
                  <span>online</span>
                </>
              ) : (
                <span>{`Last seen ${otherUser?.lastSeen ? format(otherUser.lastSeen, 'HH:mm') : 'recently'}`}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-text-dim">
          <button className="hover:text-foreground transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="hover:text-foreground transition-colors">
            <Video className="w-5 h-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground transition-colors outline-none p-1 rounded-full hover:bg-sidebar-accent">
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-sidebar border-sidebar-border rounded-xl shadow-2xl">
              <DropdownMenuItem className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                View Contact
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                Media, links, and docs
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                Search
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleClearChat}
                className="gap-2 focus:bg-sidebar-accent cursor-pointer"
              >
                Clear chat
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeleteChat}
                className="gap-2 focus:bg-sidebar-accent cursor-pointer text-rose-500 focus:text-rose-500"
              >
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        className="flex-1 p-6 relative overflow-hidden"
        style={{
          backgroundImage: profile?.settings?.customization.wallpaper && profile.settings.customization.wallpaper !== 'none' 
            ? `url(${profile.settings.customization.wallpaper})` 
            : 'radial-gradient(circle at center, rgba(0,168,132,0.05) 0%, transparent 70%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 chat-dot-pattern pointer-events-none" />
        {profile?.settings?.customization.wallpaper && profile.settings.customization.wallpaper !== 'none' && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-none" />
        )}
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center h-full py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
            </div>
          ) : (
            <React.Fragment key="messages-list">
              {chat?.participants.find(p => p !== auth.currentUser?.uid) === 'ai-assistant' && (
                <div key="ai-assistant-banner" className="flex justify-center mb-6">
                  <div className="ai-chip">GEN AI: Nexus AI Assistant Active</div>
                </div>
              )}
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const key = msg.id || `msg-${index}-${msg.timestamp || Date.now()}`;
                return (
                  <MessageBubble 
                    key={key} 
                    message={msg} 
                    isOwn={msg.senderId === auth.currentUser?.uid}
                    showAvatar={!prevMsg || prevMsg.senderId !== msg.senderId}
                    chatId={chatId}
                    otherUser={otherUser}
                    profile={profile}
                  />
                );
              })}
              {isTypingAI && (
                <div key="ai-typing-indicator" className="flex justify-start mb-4">
                  <div className="bg-bubble-received text-foreground px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div 
                    key="ai-suggestions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2 justify-center py-4"
                  >
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={`suggestion-${i}-${suggestion}`}
                        onClick={() => {
                          handleSendMessage(suggestion);
                          setSuggestions([]);
                        }}
                        className="bg-sidebar-accent hover:bg-accent-primary hover:text-white border border-sidebar-border rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-sm active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      <AnimatePresence>
        {chat?.typing && Object.entries(chat.typing).some(([uid, isTyping]) => uid !== auth.currentUser?.uid && isTyping && !otherUser?.settings?.privacy.hideTypingStatus) && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="px-6 py-2 flex items-center justify-start pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-sidebar/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-sidebar-border shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" />
              </div>
              <span className="text-[11px] text-text-dim font-medium leading-none">
                {otherUser?.displayName} is typing...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <footer className="p-4 bg-sidebar border-t border-sidebar-border">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger className="text-text-dim hover:text-accent-primary transition-colors p-2">
                <Calendar className="w-5 h-5" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-sidebar border-sidebar-border" align="start">
                <div className="p-3 border-b border-sidebar-border">
                  <h4 className="font-medium text-sm">Schedule Message</h4>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={scheduledTime ? new Date(scheduledTime) : undefined}
                  onSelect={(date) => date && setScheduledTime(date.getTime())}
                  initialFocus
                />
                {scheduledTime && (
                  <div className="p-3 bg-accent-primary/10 text-[10px] text-accent-primary text-center">
                    Scheduled for {format(scheduledTime, 'PPP')}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-text-dim hover:text-foreground transition-colors p-2"
              >
                <Paperclip className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Input 
              placeholder="Type a message" 
              className="w-full bg-sidebar-accent border-none rounded-full py-6 px-6 text-sm focus-visible:ring-1 focus-visible:ring-accent-primary/50"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleTyping(e.target.value.length > 0);
              }}
              onBlur={() => handleTyping(false)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />}
            </div>
          </div>

          {!inputText.trim() && !uploading ? (
            <button 
              type="button" 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={cn(
                "p-2.5 rounded-full transition-all",
                isRecording ? "bg-rose-500 text-white scale-125 animate-pulse" : "text-text-dim hover:text-foreground"
              )}
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          ) : (
            <button 
              type="submit"
              disabled={uploading}
              className="bg-accent-primary text-white p-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
      </footer>
    </div>
  );
}
