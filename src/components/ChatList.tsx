import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Chat, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, Plus, MoreVertical, MessageSquarePlus, UserCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Stories from './Stories';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ChatListProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onToggleProfile: () => void;
}

export default function ChatList({ activeChatId, onSelectChat, onToggleProfile }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Sort by last message timestamp manually since we can't easily order by nested field in where query without index
      chatData.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
      
      setChats(chatData);
      setLoading(false);

      // Fetch participant profiles
      const uids = new Set<string>();
      chatData.forEach(chat => chat.participants.forEach(uid => uids.add(uid)));
      
      uids.forEach(async (uid) => {
        if (uid === 'ai-assistant') {
          setUserProfiles(prev => ({ 
            ...prev, 
            [uid]: { 
              uid, 
              displayName: 'ZapTalk AI', 
              photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=ZapTalk', 
              email: 'ai@zaptalk.chat', 
              status: 'online', 
              lastSeen: Date.now(),
              bio: 'Your AI Assistant'
            } 
          }));
          return;
        }
        if (!userProfiles[uid]) {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            setUserProfiles(prev => ({ ...prev, [uid]: userSnap.data() as UserProfile }));
          }
        }
      });
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const startNewChat = async () => {
    const email = prompt('Enter user email to start a chat:');
    if (!email) return;

    try {
      // Find user by email (in a real app, use a search index or cloud function)
      // For this demo, we'll just try to find them in the 'users' collection
      // Note: Firestore doesn't support easy email search without an index, 
      // but we'll assume the user exists for this demo.
      
      // In a real app, you'd query the users collection
      toast.info('Searching for user...');
      
      // For demo purposes, let's just create a mock chat if it doesn't exist
      // In a real implementation, you'd verify the user exists first.
      
      // Check if chat already exists
      const existingChat = chats.find(c => c.type === 'one-to-one' && c.participants.includes(email)); // This is a mock check
      
      if (existingChat) {
        onSelectChat(existingChat.id);
        return;
      }

      // Mocking finding a user - in reality, you'd query Firestore
      // For now, let's just show a success message and explain it's a demo
      toast.error('User search requires a backend index. Try chatting with ZapTalk AI!');
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  const filteredChats = chats.filter(chat => {
    if (chat.type === 'group') return chat.name?.toLowerCase().includes(search.toLowerCase());
    const otherParticipantId = chat.participants.find(p => p !== auth.currentUser?.uid);
    const otherUser = userProfiles[otherParticipantId || ''];
    return otherUser?.displayName.toLowerCase().includes(search.toLowerCase()) || 
           otherUser?.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-accent-primary cursor-pointer" onClick={onToggleProfile}>
            <AvatarImage src={auth.currentUser?.photoURL || ''} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400">{auth.currentUser?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-accent-primary" />
            <h1 className="font-bold text-xl tracking-tight text-foreground">ZapTalk</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={startNewChat} className="text-text-dim hover:text-accent-primary">
            <MessageSquarePlus className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-text-dim")}>
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-sidebar border-sidebar-border text-foreground">
              <DropdownMenuItem onClick={onToggleProfile} className="hover:bg-sidebar-accent cursor-pointer">
                <UserCircle className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => auth.signOut()} className="hover:bg-sidebar-accent cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Stories />

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <Input 
            placeholder="Search or start a new chat" 
            className="pl-10 bg-sidebar-accent border-none rounded-lg h-9 text-sm focus-visible:ring-1 focus-visible:ring-accent-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 flex gap-3 animate-pulse">
                <div className="w-12 h-12 bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <p>No conversations yet.</p>
              <Button variant="link" className="text-emerald-500" onClick={startNewChat}>
                Start a new chat
              </Button>
            </div>
          ) : (
            filteredChats.map(chat => {
              const otherParticipantId = chat.participants.find(p => p !== auth.currentUser?.uid);
              const otherUser = userProfiles[otherParticipantId || ''];
              const isSelected = activeChatId === chat.id;

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "w-full p-3 flex gap-3 transition-all group relative border-b border-sidebar-border",
                    isSelected ? "bg-sidebar-accent text-foreground" : "hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.type === 'group' ? chat.avatar : otherUser?.photoURL} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">{chat.type === 'group' ? chat.name?.charAt(0) : otherUser?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {otherUser?.status === 'online' && (
                      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-accent-primary border-2 border-sidebar rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-[15px] truncate">
                        {chat.type === 'group' ? chat.name : otherUser?.displayName || 'Loading...'}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-[11px] text-text-dim">
                          {formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-text-dim truncate">
                        {chat.typing?.[otherParticipantId || ''] ? (
                          <span className="text-accent-primary animate-pulse italic">typing...</span>
                        ) : (
                          chat.lastMessage?.text || 'No messages yet'
                        )}
                      </p>
                      {chat.unreadCount?.[auth.currentUser?.uid || ''] ? (
                        <div className="w-5 h-5 bg-accent-primary rounded-full flex items-center justify-center text-[10px] font-bold text-black">
                          {chat.unreadCount[auth.currentUser?.uid || '']}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
