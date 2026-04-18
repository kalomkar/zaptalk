import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { Chat, UserProfile } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, Archive, Bot } from 'lucide-react';
import { useUser } from '../../context/UserContext';

interface ChatsTabProps {
  onChatSelect: (chatId: string) => void;
}

export default function ChatsTab({ onChatSelect }: ChatsTabProps) {
  const { localContacts } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

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
          if (uid !== auth.currentUser?.uid && uid !== 'ai-assistant' && !profiles[uid]) {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              setProfiles(prev => ({ ...prev, [uid]: userSnap.data() as UserProfile }));
            }
          }
        });
      });
    });

    return () => unsubscribe();
  }, [profiles]);

  // Combine Firebase chats and local contacts and deduplicate by ID
  const combined = [...localContacts, ...chats];
  const allChats = combined
    .filter((chat, index, self) => index === self.findIndex((c) => c.id === chat.id))
    .sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      return timeB - timeA;
    });

  // Helper to get the other participant's profile
  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(id => id !== auth.currentUser?.uid);
    return otherId;
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Archived row */}
        <div className="px-4 py-3 flex items-center gap-4 hover:bg-sidebar-accent/50 cursor-pointer transition-colors border-b border-sidebar-border/10">
          <div className="w-12 flex justify-center">
            <Archive className="w-5 h-5 text-accent-primary" />
          </div>
          <span className="font-semibold text-foreground">Archived</span>
          <span className="ml-auto text-xs text-accent-primary font-bold">12</span>
        </div>

        {allChats.map((chat) => {
          const otherId = getOtherParticipant(chat);
          const isAI = otherId === 'ai-assistant';
          const isLocal = chat.id?.startsWith('local_');
          const otherProfile = otherId ? profiles[otherId] : null;
          
          const chatName = isLocal ? chat.name : (isAI ? 'ZapTalk AI' : (otherProfile?.displayName || otherId?.slice(0, 8) || 'User'));
          const chatAvatar = isLocal ? chat.avatar : (isAI ? 'https://api.dicebear.com/7.x/bottts/svg?seed=ZapTalk' : (otherProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`));
          
          return (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className="px-4 py-3 flex items-center gap-3 hover:bg-sidebar-accent/50 cursor-pointer transition-colors active:bg-sidebar-accent"
            >
              <div className="relative">
                <Avatar className="w-12 h-12 border border-sidebar-border/50">
                  <AvatarImage src={chatAvatar} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-semibold text-foreground truncate">
                    {chatName}
                  </h3>
                  <span className="text-[10px] text-text-dim">
                    {chat.lastMessage ? formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: false }) : ''}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-text-dim truncate">
                    {chat.lastMessage?.senderId === auth.currentUser?.uid && (
                      <CheckCheck className="w-3.5 h-3.5 text-accent-primary" />
                    )}
                    <p className="truncate">{chat.lastMessage?.text || 'No messages yet'}</p>
                  </div>
                  
                  {chat.unreadCount?.[auth.currentUser?.uid || ''] > 0 && (
                    <span className="bg-accent-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {chat.unreadCount[auth.currentUser!.uid]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
