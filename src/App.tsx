import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { User } from 'firebase/auth';
import { UserProfile } from './types';
import Auth from './components/Auth';
import TabsSlider from './components/TabsSlider';
import ChatWindow from './components/ChatWindow';
import Sidebar from './components/Sidebar';
import AddContactModal from './components/AddContactModal';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProvider, useUser } from './context/UserContext';
import { CallProvider } from './context/CallContext';
import CallingOverlay from './components/CallingOverlay';

function AppContent() {
  const { profile, localContacts, updateProfile, addContact } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLocalContact = (contact: { name: string; phone: string; avatar: string }) => {
    const newChat = {
      id: `local_${Date.now()}`,
      type: 'one-to-one',
      participants: [user?.uid || '', contact.phone],
      name: contact.name,
      avatar: contact.avatar,
      lastMessage: {
        id: `local_msg_${Date.now()}`,
        senderId: contact.phone,
        text: 'Start chatting',
        timestamp: Date.now(),
        type: 'text',
        status: 'seen',
        isEncrypted: true
      },
      unreadCount: { [user?.uid || '']: 0 }
    };
    addContact(newChat);
    setSelectedChatId(newChat.id);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <TooltipProvider>
        <Auth />
        <Toaster position="top-center" />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-full bg-background text-foreground flex overflow-hidden font-sans">
        {/* Sidebar / Tabs Slider */}
        <div className={`w-full md:w-[380px] border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <TabsSlider 
            onChatSelect={setSelectedChatId} 
            onToggleSettings={() => setShowProfile(true)}
            onToggleAddContact={() => setShowAddContact(true)}
          />
        </div>

        {/* Main Chat Window */}
        <div className={`flex-1 relative flex flex-col min-w-0 bg-background ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {selectedChatId ? (
              <motion.div 
                key={selectedChatId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full w-full flex flex-col"
              >
                {/* Mobile Back Button */}
                <div className="md:hidden absolute top-4 left-4 z-50">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedChatId(null)}
                    className="bg-sidebar/80 backdrop-blur-sm rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
                <ChatWindow 
                  chatId={selectedChatId} 
                  localChat={localContacts.find(c => c.id === selectedChatId)}
                  onDelete={() => setSelectedChatId(null)}
                />
              </motion.div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-text-dim p-8 text-center bg-[radial-gradient(circle_at_center,rgba(0,168,132,0.05)_0%,transparent_70%)]">
                <div className="w-24 h-24 bg-sidebar rounded-full flex items-center justify-center mb-6 border border-sidebar-border">
                  <Zap className="w-12 h-12 text-accent-primary opacity-50" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">ZapTalk</h2>
                <p className="max-w-xs">Select a conversation to start messaging. Your messages are end-to-end encrypted.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Overlay */}
        <AnimatePresence>
          {showProfile && (
            <Sidebar 
              onClose={() => setShowProfile(false)} 
            />
          )}
        </AnimatePresence>

        {/* Add Contact Modal */}
        <AddContactModal 
          isOpen={showAddContact}
          onClose={() => setShowAddContact(false)}
        />

        <Toaster position="top-center" />
        <CallingOverlay />
      </div>
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <CallProvider>
        <AppContent />
      </CallProvider>
    </UserProvider>
  );
}
