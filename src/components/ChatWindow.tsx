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
  deleteField,
  arrayUnion
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
  X,
  Trash2,
  User,
  Image
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, isToday, isYesterday } from 'date-fns';
import { encryptMessage, decryptMessage } from '../lib/encryption';
import { MessageBubble } from './MessageBubble';
import { 
  generateAIResponse, 
  generateReplySuggestions,
  summarizeConversation,
  generateSmartReply
} from '../services/aiService';
import { ProfilePanel } from './ProfilePanel';
import { 
  Star, 
  RotateCcw, 
  Reply, 
  Forward, 
  Pin, 
  Search as SearchIcon, 
  ListRestart, 
  Command,
  Plus,
  Sparkles,
  History,
  Languages,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  chatId: string;
  localChat?: any;
  onDelete?: () => void;
}

import { useUser } from '../context/UserContext';
import { useCall } from '../context/CallContext';
import * as ReactWindow from 'react-window';
import * as ReactVirtualizedAutoSizer from 'react-virtualized-auto-sizer';

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

const SLASH_COMMANDS = [
  { command: '/ai', label: 'Ask AI', icon: Bot, description: 'Ask Gemini anything', color: 'text-blue-500' },
  { command: '/summarize', label: 'Summarize', icon: ListRestart, description: 'Summarize recent chat', color: 'text-amber-500' },
  { command: '/reply', label: 'Magic Reply', icon: Sparkles, description: 'Generate a smart reply', color: 'text-purple-500' },
  { command: '/translate', label: 'Translate', icon: Languages, description: 'Translate last message', color: 'text-emerald-500' },
];

export default function ChatWindow({ chatId, localChat, onDelete }: ChatWindowProps) {
  const { profile, socket, updateProfile } = useUser();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [remoteTypingData, setRemoteTypingData] = useState<{ text: string, isDeleting: boolean } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getMessageDateGroup = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'd MMMM yyyy');
  };
 
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
        const text = lastMsg.isEncrypted ? decryptMessage(lastMsg.text || '') : lastMsg.text;
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
        const text = lastMsg.isEncrypted ? decryptMessage(lastMsg.text || '') : lastMsg.text;
        const newSuggestions = await generateReplySuggestions(text);
        setSuggestions(newSuggestions);
        setLoadingSuggestions(false);
      };
      getSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [messages, profile?.settings?.aiSuggestionsEnabled, auth.currentUser]);
  useEffect(() => {
    if (!chatId || !socket) return;

    socket.emit('join_room', chatId);

    socket.on('typing_update', (data) => {
      if (data.userId !== auth.currentUser?.uid) {
        setRemoteTypingData(data);
        
        // Auto-clear typing indicator after 2 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setRemoteTypingData(null);
        }, 2000);
      }
    });

    socket.on('status_updated', (data) => {
      setMessages(prev => prev.map(m => 
        m.id === data.messageId ? { ...m, status: data.status } : m
      ));
    });

    return () => {
      socket.off('typing_update');
      socket.off('status_updated');
    };
  }, [chatId, socket]);

  const handleTyping = async (text: string, isDeleting = false) => {
    if (!auth.currentUser || !chatId || chatId.startsWith('local_') || profile?.settings?.privacy.hideTypingStatus) return;
    
    // Send standard Firestore "is typing" status for offline/legacy support
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${auth.currentUser.uid}`]: text.length > 0
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}`);
    }

    // Emit live text preview via WebSockets for "Live Typing" feature
    socket?.emit('typing', {
      chatId,
      userId: auth.currentUser.uid,
      text: text,
      isDeleting: isDeleting
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [scheduledTime, setScheduledTime] = useState<number | null>(null);

  const lastInputLength = useRef(0);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const isDeleting = val.length < lastInputLength.current;
    lastInputLength.current = val.length;
    
    setInputText(val);
    handleTyping(val, isDeleting);
    setShowSlashCommands(val === '/');
  };

  const handleSendMessage = async (e?: React.FormEvent, type: Message['type'] = 'text', file?: { url: string, name: string, size: number }) => {
    if (e) e.preventDefault();
    const textToSend = typeof e === 'string' ? e : inputText.trim();
    if (!textToSend && type === 'text' && !file) return;
    if (!auth.currentUser || !chatId) return;

    // Handle Slash Commands
    if (textToSend.startsWith('/')) {
      handleSlashCommand(textToSend);
      setInputText('');
      setShowSlashCommands(false);
      return;
    }

    setInputText('');
    handleTyping('');
    setReplyingTo(null);

    try {
      const messageData: any = {
        senderId: auth.currentUser.uid,
        text: type === 'text' ? encryptMessage(textToSend) : '',
        timestamp: Date.now(),
        type,
        status: 'sent',
        isEncrypted: type === 'text'
      };

      if (replyingTo) {
        messageData.replyTo = replyingTo.id;
      }

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

      // 4. Emit socket event for delivery tracking
      if (otherUser && socket) {
        socket.emit('new_message', {
          chatId,
          senderId: auth.currentUser.uid,
          receiverId: otherUser.uid,
          messageId: msgRef.id
        });
      }

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
    
    // Memory context: last 5 messages
    const history = messages.slice(-5).map(m => ({
      role: m.senderId === auth.currentUser?.uid ? 'user' as const : 'model' as const,
      parts: [{ text: m.isEncrypted ? decryptMessage(m.text) : m.text }]
    }));

    const aiText = await generateAIResponse(prompt, history, profile?.settings?.aiPersonality);
    
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

  const handleSlashCommand = async (commandStr: string) => {
    const [cmd, ...args] = commandStr.split(' ');
    const argText = args.join(' ');

    switch (cmd) {
      case '/ai':
        handleAIResponse(argText || "Hello!");
        break;
      case '/summarize':
        setIsTypingAI(true);
        const summary = await summarizeConversation(messages.slice(-20).map(m => ({
          sender: m.senderId === auth.currentUser?.uid ? 'Me' : otherUser?.displayName || 'Contact',
          text: m.isEncrypted ? decryptMessage(m.text) : m.text
        })));
        sendAISystemMessage(summary);
        break;
      case '/reply':
        setIsTypingAI(true);
        const lastRecMessage = [...messages].reverse().find(m => m.senderId !== auth.currentUser?.uid);
        if (lastRecMessage) {
          const smartReply = await generateSmartReply(lastRecMessage.isEncrypted ? decryptMessage(lastRecMessage.text) : lastRecMessage.text);
          setInputText(smartReply);
        } else {
          toast.error("No recent message to reply to");
        }
        setIsTypingAI(false);
        break;
      case '/translate':
        setIsTypingAI(true);
        const lastMsgT = [...messages].reverse().find(m => m.type === 'text');
        if (lastMsgT) {
          const textToTrans = lastMsgT.isEncrypted ? decryptMessage(lastMsgT.text) : lastMsgT.text;
          const trans = await generateAIResponse(`Translate the following to English: ${textToTrans}`);
          sendAISystemMessage(trans);
        }
        setIsTypingAI(false);
        break;
    }
  };

  const sendAISystemMessage = async (text: string) => {
    const aiMessage = {
      senderId: 'ai-assistant',
      text: text,
      timestamp: Date.now(),
      type: 'ai' as const,
      status: 'sent' as const,
      isEncrypted: false
    };

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), aiMessage);
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: { ...aiMessage, id: msgRef.id },
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
      throw error; // Re-throw to be handled by caller if necessary
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || chatId?.startsWith('local_')) return;
    try {
      // Clear messages first (swallow error if we still want to try deleting the chat doc)
      try {
        await handleClearChat();
      } catch (e) {
        console.error("Clearing messages failed, proceeding to delete chat doc:", e);
      }
      
      await deleteDoc(doc(db, 'chats', chatId));
      toast.success('Chat deleted');
      if (onDelete) onDelete();
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden bg-dots">
      {/* Search Header Overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0 }}
            className="absolute top-0 inset-x-0 h-[70px] glass-dark z-50 flex items-center px-6 gap-4 shadow-premium"
          >
            <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-2 border border-white/10">
              <SearchIcon className="w-5 h-5 text-accent-primary" />
              <input 
                autoFocus
                placeholder="Search in conversation..."
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-text-dimmer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-[70px] px-6 py-3 flex items-center justify-between border-b border-white/5 glass-dark sticky top-0 z-40">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => setIsProfileOpen(true)}
        >
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-white/5 group-hover:border-accent-primary/50 transition-all duration-300 shadow-premium">
              <AvatarImage src={chat?.type === 'group' ? chat.avatar : otherUser?.photoURL} />
              <AvatarFallback className="bg-sidebar-accent text-text-dim text-xs font-bold">
                {chat?.type === 'group' ? chat.name?.slice(0, 2).toUpperCase() : otherUser?.displayName?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {otherUser?.status === 'online' && (
               <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent-primary border-2 border-sidebar rounded-full shadow-[0_0_10px_rgba(0,230,118,0.5)]" />
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-[16px] text-foreground tracking-tight group-hover:text-accent-primary transition-colors duration-300">
              {chat?.type === 'group' ? chat.name : otherUser?.displayName}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] font-medium transition-all">
              {otherUser?.status === 'online' ? (
                <span className="text-accent-primary animate-pulse">Online</span>
              ) : (
                <span className="text-text-dim">
                  {otherUser?.lastSeen ? `Last seen ${format(otherUser.lastSeen, 'HH:mm')}` : 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              const current = profile?.settings?.aiAutoReplyEnabled;
              updateProfile({ 
                settings: { 
                  ...profile!.settings!, 
                  aiAutoReplyEnabled: !current 
                } 
              });
              toast.info(`AI Auto Reply ${!current ? 'Enabled' : 'Disabled'}`);
            }}
            className={cn(
              "hidden sm:flex gap-2 text-[10px] uppercase font-bold tracking-widest h-9 px-4 rounded-xl border transition-all duration-300",
              profile?.settings?.aiAutoReplyEnabled 
                ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20 shadow-[0_0_15px_rgba(0,230,118,0.1)]" 
                : "bg-white/5 text-text-dim border-white/5 hover:bg-white/10"
            )}
          >
            <Bot className={cn("w-4 h-4", profile?.settings?.aiAutoReplyEnabled && "animate-bounce")} />
            AI Mode
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <TooltipProvider>
              <button 
                onClick={() => otherUser && startCall(otherUser.uid, otherUser.displayName, otherUser.photoURL, false)}
                className="p-2.5 text-text-dim hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all duration-300 active:scale-90"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button 
                onClick={() => otherUser && startCall(otherUser.uid, otherUser.displayName, otherUser.photoURL, true)}
                className="p-2.5 text-text-dim hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all duration-300 active:scale-90"
              >
                <Video className="w-5 h-5" />
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2.5 text-text-dim hover:text-foreground hover:bg-white/5 rounded-xl transition-all duration-300 outline-none active:scale-90">
                  <MoreVertical className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-sidebar/95 backdrop-blur-xl border-white/5 rounded-2xl shadow-premium p-1">
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                    <User className="w-4 h-4" /> View Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                    <ImageIcon className="w-4 h-4" /> Media & Links
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSearching(true)} className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                    <SearchIcon className="w-4 h-4" /> Search
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5 mx-1 my-1" />
                  <DropdownMenuItem 
                    onClick={handleClearChat}
                    className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Clear Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteChat}
                    className="rounded-xl py-2.5 gap-3 focus:bg-rose-500/10 cursor-pointer text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: profile?.settings?.customization.wallpaper && profile.settings.customization.wallpaper !== 'none' 
            ? `url(${profile.settings.customization.wallpaper})` 
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-dots pointer-events-none opacity-40" />
        {profile?.settings?.customization.wallpaper && profile.settings.customization.wallpaper !== 'none' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />
        )}
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-primary/50" />
          </div>
        ) : (
          <ReactVirtualizedAutoSizer.default>
            {({ height, width }: { height: number, width: number }) => {
              const flatList = [];
              let lastDate = null;
              messages.forEach((msg) => {
                const dateGroup = getMessageDateGroup(msg.timestamp);
                if (dateGroup !== lastDate) {
                  flatList.push({ type: 'date', value: dateGroup });
                  lastDate = dateGroup;
                }
                flatList.push({ type: 'msg', value: msg });
              });

              return (
                <ReactWindow.FixedSizeList
                  height={height}
                  width={width}
                  itemCount={flatList.length}
                  itemSize={80} // Estimated height
                >
                  {({ index, style }) => {
                    const item = flatList[index];
                    return (
                      <div style={style}>
                        {item.type === 'date' ? (
                          <div className="flex justify-center my-4">
                            <span className="glass-dark text-text-dim text-[10px] font-bold px-4 py-1.5 rounded-full border border-white/5 shadow-premium uppercase tracking-widest">
                              {item.value}
                            </span>
                          </div>
                        ) : (
                          <MessageBubble 
                            message={item.value} 
                            isOwn={item.value.senderId === auth.currentUser?.uid}
                            showAvatar={true}
                            chatId={chatId}
                            otherUser={otherUser}
                            profile={profile}
                            onReply={(m) => setReplyingTo(m)}
                            onReact={async (emoji) => {
                              try {
                                await updateDoc(doc(db, 'chats', chatId, 'messages', item.value.id), {
                                  [`reactions.${emoji}`]: arrayUnion(auth.currentUser?.uid)
                                });
                              } catch (e) {
                                toast.error('Failed to react');
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  }}
                </ReactWindow.FixedSizeList>
              );
            }}
          </ReactVirtualizedAutoSizer.default>
        )}
      </div>

      {/* Action Footer */}
      <footer className="px-6 py-4 pb-8 space-y-4 glass-dark border-t border-white/5 z-40">
        <AnimatePresence>
          {(remoteTypingData || (chat?.typing && Object.entries(chat.typing).some(([uid, isTyping]) => uid !== auth.currentUser?.uid && isTyping && !otherUser?.settings?.privacy.hideTypingStatus))) && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute -top-14 left-8 pointer-events-none"
            >
              <div className="flex items-center gap-3 glass-dark px-5 py-2.5 rounded-2xl border border-accent-primary/20 shadow-premium group">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" />
                </div>
                <span className="text-[12px] text-accent-primary font-black uppercase tracking-widest leading-none">
                  {otherUser?.displayName} {remoteTypingData ? 'Live typing' : 'typing...'}
                </span>
                {remoteTypingData && remoteTypingData.text && (
                  <div className="ml-1 px-3 py-1 bg-accent-primary/10 rounded-xl border border-accent-primary/10">
                     <p className="text-[11px] text-accent-primary font-bold max-w-[150px] truncate">{remoteTypingData.text}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.98 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.98 }}
              className="mx-auto max-w-4xl px-5 py-4 bg-accent-primary/5 border-l-[6px] border-accent-primary mb-4 rounded-r-3xl flex items-center justify-between shadow-premium glass-dark"
            >
              <div className="min-w-0 pr-6">
                <p className="text-[11px] font-black text-accent-primary uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                  <Reply className="w-4 h-4" /> Message Thread Reply
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-[2px] h-4 bg-white/10" />
                  <p className="text-sm text-text-dim truncate italic max-w-2xl">
                    "{replyingTo.isEncrypted ? decryptMessage(replyingTo.text) : replyingTo.text}"
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-text-dim hover:text-rose-500 transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger className="text-text-dim hover:text-accent-primary transition-all duration-300 w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/5 active:scale-95">
                <Calendar className="w-6 h-6" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-sidebar/95 backdrop-blur-2xl border-white/5 rounded-3xl shadow-premium overflow-hidden" align="start">
                <div className="p-5 border-b border-white/5 bg-white/5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-primary">Message Scheduler</h4>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={scheduledTime ? new Date(scheduledTime) : undefined}
                  onSelect={(date) => date && setScheduledTime(date.getTime())}
                  initialFocus
                  className="p-4"
                />
                {scheduledTime && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-accent-primary text-[11px] font-black text-black text-center uppercase tracking-widest"
                  >
                    Set for: {format(scheduledTime, 'PPP')}
                  </motion.div>
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
                className="text-text-dim hover:text-accent-primary transition-all duration-300 w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/5 active:scale-95"
              >
                <Paperclip className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-accent-primary/20 via-accent-secondary/20 to-accent-primary/20 rounded-[28px] opacity-0 group-focus-within:opacity-100 transition-opacity blur-md pointer-events-none" />
            <div className="relative">
              <Input 
                placeholder="Message securely..." 
                className="w-full bg-white/5 border-white/5 rounded-[24px] py-8 px-8 text-[15px] font-medium placeholder:text-text-dimmer/40 focus-visible:ring-1 focus-visible:ring-accent-primary/40 focus-visible:bg-white/10 transition-all shadow-premium pr-16"
                value={inputText}
                onChange={handleInputChange}
                onBlur={() => handleTyping('')}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                <button type="button" className="text-text-dimmer hover:text-accent-primary p-1.5 transition-all active:scale-90">
                  <Smile className="w-6 h-6" />
                </button>
                {uploading && <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            {!inputText.trim() && !uploading ? (
              <button 
                type="button" 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={cn(
                  "w-[60px] h-[60px] rounded-[24px] flex items-center justify-center transition-all duration-500 relative group",
                  isRecording 
                    ? "bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)] scale-110 z-10" 
                    : "bg-white/5 text-text-dim hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/20 border border-transparent"
                )}
              >
                {isRecording && <div className="absolute inset-x-0 -top-12 text-[10px] font-black uppercase text-rose-500 animate-pulse text-center">Recording</div>}
                {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
              </button>
            ) : (
              <button 
                type="submit"
                disabled={uploading}
                onClick={handleSendMessage}
                className="bg-accent-primary text-black w-[60px] h-[60px] rounded-[24px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-premium group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Send className="w-7 h-7 relative z-10 -rotate-12 group-hover:rotate-0 transition-transform" />
              </button>
            )}
          </div>
        </div>
        
        {/* Floating AI Command Menu Overlay */}
        <AnimatePresence>
          {showSlashCommands && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-[100px] left-6 w-72 glass-dark border-white/10 rounded-3xl shadow-premium z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 bg-accent-primary/5 flex items-center gap-3">
                <div className="p-2 bg-accent-primary/10 rounded-xl">
                  <Command className="w-4 h-4 text-accent-primary" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-accent-primary">AI Commands</h4>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {SLASH_COMMANDS.map((item) => (
                  <button
                    key={item.command}
                    onClick={() => {
                      setInputText(item.command + ' ');
                      setShowSlashCommands(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-2xl transition-all group text-left"
                  >
                    <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform shadow-sm", item.color.replace('text-', 'bg-') + '/10')}>
                      <item.icon className={cn("w-4 h-4", item.color)} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{item.command}</p>
                      <p className="text-[10px] text-text-dim">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Profile Panel */}
      <ProfilePanel 
        user={otherUser} 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
}
