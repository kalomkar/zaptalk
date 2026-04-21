import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Chat, UserProfile } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Search, Check, CheckCheck, Archive, Bot, ArrowLeft, ArchiveX, Pin, Zap } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { decryptMessage } from '../../lib/encryption';

interface ChatsTabProps {
  onChatSelect: (chatId: string) => void;
}

export default function ChatsTab({ onChatSelect }: ChatsTabProps) {
  const { localContacts, profile } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'archived'>('inbox');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatData);

      // Fetch profiles for participants
      chatData.forEach(chat => {
        chat.participants.forEach(async (uid) => {
          if (uid !== auth.currentUser?.uid && uid !== 'ai-assistant') {
            setProfiles(prev => {
              if (prev[uid]) return prev; // Already have it, skip
              
              // Fetch only if not in state
              (async () => {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                  setProfiles(p => ({ ...p, [uid]: userSnap.data() as UserProfile }));
                }
              })();
              
              return prev;
            });
          }
        });
      });
    });

    return () => unsubscribe();
  }, []); // Only run once on mount (or when auth.currentUser changes if we added that)

  // Helper to get the other participant's profile
  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(id => id !== auth.currentUser?.uid);
    return otherId;
  };

  const archiveChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!auth.currentUser || chatId.startsWith('local_')) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        archivedBy: arrayUnion(auth.currentUser.uid)
      });
      toast.success('Chat archived');
    } catch (err) {
      toast.error('Failed to archive chat');
    }
  };

  const unarchiveChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!auth.currentUser || chatId.startsWith('local_')) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        archivedBy: arrayRemove(auth.currentUser.uid)
      });
      toast.success('Chat unarchived');
    } catch (err) {
      toast.error('Failed to unarchive chat');
    }
  };

  const pinChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!auth.currentUser || chatId.startsWith('local_')) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        pinnedBy: arrayUnion(auth.currentUser.uid)
      });
      toast.success('Chat pinned');
    } catch (err) {
      toast.error('Failed to pin chat');
    }
  };

  const unpinChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!auth.currentUser || chatId.startsWith('local_')) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        pinnedBy: arrayRemove(auth.currentUser.uid)
      });
      toast.success('Chat unpinned');
    } catch (err) {
      toast.error('Failed to unpin chat');
    }
  };

  // Combine Firebase chats and local contacts and deduplicate by ID
  const combined = [...localContacts, ...chats];
  const allChats = combined
    .filter((chat, index, self) => index === self.findIndex((c) => c.id === chat.id))
    .sort((a, b) => {
      // 1. Sort by Pinned status
      const isAPinned = a.pinnedBy?.includes(auth.currentUser?.uid || '');
      const isBPinned = b.pinnedBy?.includes(auth.currentUser?.uid || '');
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;

      // 2. Sort by time
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      return timeB - timeA;
    });

  const isArchived = (chat: Chat) => chat.archivedBy?.includes(auth.currentUser?.uid || '');

  const folderChats = allChats.filter(chat => {
    if (activeFolder === 'archived') return isArchived(chat);
    return !isArchived(chat);
  });

  const filteredChats = folderChats.filter(chat => {
    const otherId = getOtherParticipant(chat);
    const otherProfile = otherId ? profiles[otherId] : null;
    const name = (otherProfile?.displayName || chat.name || '').toLowerCase();
    const lastMsgRaw = chat.lastMessage?.text || '';
    const lastMsg = (chat.lastMessage?.isEncrypted ? decryptMessage(lastMsgRaw) : lastMsgRaw).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || lastMsg.includes(query);
  });

  const archiveCount = allChats.filter(isArchived).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-sidebar">
      {/* Header for Archived View */}
      <AnimatePresence>
        {activeFolder === 'archived' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 60, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 flex items-center gap-4 border-b border-white/5 bg-accent-primary/5"
          >
            <button 
              onClick={() => setActiveFolder('inbox')}
              className="p-2 hover:bg-white/10 rounded-full text-accent-primary transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-black text-sm uppercase tracking-[0.2em] text-accent-primary">Archived Conversations</h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar Area */}
      <div className="px-6 py-5">
        <div className="relative group/search">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent-primary/30 to-accent-secondary/30 rounded-[22px] opacity-0 group-focus-within/search:opacity-100 blur-md transition-opacity pointer-events-none" />
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dimmer group-focus-within/search:text-accent-primary transition-all duration-300" />
            <input 
              type="text"
              placeholder={activeFolder === 'inbox' ? "Search secure line..." : "Search archived..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-[18px] py-4 pl-14 pr-6 text-sm font-bold placeholder:text-text-dimmer/40 placeholder:font-medium focus:bg-white/10 focus:border-accent-primary/20 transition-all outline-none shadow-premium"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col px-2 pb-20">
          {/* Archived Access Row */}
          {searchQuery === '' && activeFolder === 'inbox' && archiveCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setActiveFolder('archived')}
              className="mx-4 px-5 py-5 flex items-center gap-5 hover:bg-white/5 cursor-pointer transition-all duration-300 rounded-[22px] group border border-transparent hover:border-white/5 mb-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 flex items-center justify-center bg-accent-primary/10 rounded-2xl group-hover:bg-accent-primary/20 group-hover:scale-105 transition-all shadow-premium border border-accent-primary/20">
                <Archive className="w-7 h-7 text-accent-primary" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-black text-[15px] text-foreground tracking-tight">Archived Vault</span>
                <span className="text-[10px] text-accent-primary/60 font-black uppercase tracking-[0.2em] mt-1">Total {archiveCount} conversations secure</span>
              </div>
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-text-dimmer group-hover:text-accent-primary transition-all">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </div>
            </motion.div>
          )}

          {filteredChats.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center px-8">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse">
                <Zap className="w-10 h-10 text-white/10" />
              </div>
              <p className="text-sm font-bold text-text-dim tracking-tight">{searchQuery ? 'No match found' : 'Silence is golden'}</p>
              <p className="text-[11px] text-text-dimmer mt-2 max-w-[200px] leading-relaxed">
                {searchQuery ? 'Try searching for someone else or start a new conversation.' : 'Start a new conversation and it will appear right here.'}
              </p>
            </div>
          )}

          {filteredChats.map((chat, idx) => {
            const otherId = getOtherParticipant(chat);
          const isAI = otherId === 'ai-assistant';
          const isLocal = chat.id?.startsWith('local_');
          const otherProfile = otherId ? profiles[otherId] : null;
          
          const chatName = isLocal ? chat.name : (isAI ? 'ZapTalk AI Assistant' : (otherProfile?.displayName || otherId?.slice(0, 8) || 'User'));
          const chatAvatar = isLocal ? chat.avatar : (isAI ? 'https://api.dicebear.com/7.x/bottts/svg?seed=ZapTalk&variant=pixel' : (otherProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`));
          
          const isPinned = chat.pinnedBy?.includes(auth.currentUser?.uid || '');

          return (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onChatSelect(chat.id)}
              className="mx-2 px-4 py-4 flex items-center gap-4 hover:bg-white/5 cursor-pointer transition-all duration-300 rounded-2xl group border border-transparent hover:border-white/5 group relative mb-1"
            >
              <div className="relative">
                <Avatar className="w-14 h-14 border-2 border-white/5 group-hover:border-accent-primary/30 transition-all shadow-premium">
                  <AvatarImage src={chatAvatar} className="object-cover" />
                  <AvatarFallback className="bg-sidebar-accent text-text-dim">{chatName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {otherProfile?.status === 'online' && (
                  <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-accent-primary border-2 border-sidebar rounded-full ring-2 ring-accent-primary/20" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[15px] text-foreground truncate tracking-tight group-hover:text-accent-primary transition-colors">
                    {chatName}
                  </h3>
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-widest group-hover:text-foreground transition-colors">
                    {chat.lastMessage ? formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: false }).replace('about ', '') : ''}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-text-dim group-hover:text-text-dim transition-colors truncate pr-4">
                    {chat.lastMessage?.senderId === auth.currentUser?.uid && (
                      <CheckCheck className={cn("w-3.5 h-3.5", chat.lastMessage.status === 'seen' ? "text-accent-primary" : "text-text-dimmer")} />
                    )}
                    <p className="truncate font-medium">
                      {chat.lastMessage 
                        ? (chat.lastMessage.isEncrypted ? decryptMessage(chat.lastMessage.text) : chat.lastMessage.text)
                        : 'No messages yet'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isPinned && (
                      <Pin className="w-3.5 h-3.5 text-accent-primary fill-accent-primary rotate-45 animate-pulse" />
                    )}
                    {chat.unreadCount?.[auth.currentUser?.uid || ''] > 0 && (
                      <span className="bg-accent-primary text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-premium">
                        {chat.unreadCount[auth.currentUser!.uid]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="absolute right-4 bottom-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                <button 
                  onClick={(e) => isPinned ? unpinChat(e, chat.id) : pinChat(e, chat.id)}
                  className="p-1.5 hover:bg-accent-primary/10 rounded-lg text-text-dim hover:text-accent-primary transition-all active:scale-90"
                  title={isPinned ? "Unpin Chat" : "Pin Chat"}
                >
                  <Pin className={cn("w-4 h-4", isPinned && "fill-accent-primary")} />
                </button>
                <button 
                  onClick={(e) => activeFolder === 'inbox' ? archiveChat(e, chat.id) : unarchiveChat(e, chat.id)}
                  className="p-1.5 hover:bg-accent-primary/10 rounded-lg text-text-dim hover:text-accent-primary transition-all active:scale-90"
                  title={activeFolder === 'inbox' ? "Archive Chat" : "Unarchive Chat"}
                >
                  {activeFolder === 'inbox' ? <Archive className="w-4 h-4" /> : <ArchiveX className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  </div>
);
}
