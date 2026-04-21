import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MoreVertical, Camera, Phone, Video, UserPlus, Zap, Settings, User, LogOut } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ChatsTab from './tabs/ChatsTab';
import StatusTab from './tabs/StatusTab';
import CallsTab from './tabs/CallsTab';
import { auth } from '../firebase';

type TabType = 'chats' | 'status' | 'calls';

interface TabsSliderProps {
  onChatSelect: (chatId: string) => void;
  onToggleSettings: () => void;
  onToggleAddContact: () => void;
}

import { useUser } from '../context/UserContext';

export default function TabsSlider({ 
  onChatSelect, 
  onToggleSettings, 
  onToggleAddContact
}: TabsSliderProps) {
  const { profile, localContacts } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('chats');

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'chats', label: 'Chats', count: 5 + localContacts.length },
    { id: 'status', label: 'Status' },
    { id: 'calls', label: 'Calls' },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-white/5 relative">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between glass-dark border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSettings}
            className="relative group transition-all active:scale-95"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-accent-primary to-accent-secondary rounded-full blur opacity-40 group-hover:opacity-70 transition-opacity" />
            <Avatar className="w-11 h-11 border-2 border-sidebar relative shadow-premium">
              <AvatarImage src={profile?.photoURL} />
              <AvatarFallback className="bg-sidebar-accent text-accent-primary font-bold text-sm">
                {profile?.displayName?.charAt(0) || <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-primary border-2 border-sidebar rounded-full shadow-[0_0_8px_rgba(0,230,118,0.5)]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-foreground leading-none">ZapTalk</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
               <p className="text-[10px] text-accent-primary font-black uppercase tracking-widest">Active Now</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-10 h-10 text-text-dim hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all duration-300">
            <Search className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-10 h-10 text-text-dim hover:text-foreground hover:bg-white/5 rounded-xl transition-all duration-300 outline-none")}>
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-sidebar/95 backdrop-blur-xl border-white/5 rounded-2xl shadow-premium p-1">
              <DropdownMenuItem onClick={onToggleAddContact} className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                <UserPlus className="w-4 h-4 text-accent-primary" /> New Contact
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                <User className="w-4 h-4 text-accent-secondary" /> New Group
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5 mx-1 my-1" />
              <DropdownMenuItem onClick={onToggleSettings} className="rounded-xl py-2.5 gap-3 focus:bg-white/5 cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => auth.signOut()} className="rounded-xl py-2.5 gap-3 focus:bg-rose-500/10 cursor-pointer text-rose-500">
                <LogOut className="w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex bg-sidebar border-b border-white/5 relative px-2 py-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-[13px] font-black uppercase tracking-widest transition-all relative z-10 ${
              activeTab === tab.id ? 'text-foreground' : 'text-text-dim hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.count && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] font-black transition-all",
                  activeTab === tab.id ? "bg-accent-primary text-black" : "bg-white/10 text-text-dim"
                )}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-1 left-4 right-4 h-1 bg-accent-primary rounded-full shadow-[0_0_10px_rgba(0,230,118,0.4)]"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Sliding Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ x: activeTab === 'chats' ? -20 : 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: activeTab === 'chats' ? 20 : -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full"
          >
            {activeTab === 'chats' && <ChatsTab onChatSelect={onChatSelect} />}
            {activeTab === 'status' && <StatusTab />}
            {activeTab === 'calls' && <CallsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        {activeTab === 'status' && (
          <Button size="icon" className="w-10 h-10 rounded-full bg-sidebar-accent border border-sidebar-border shadow-lg text-text-dim hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        )}
        <Button 
          onClick={() => {
            if (activeTab === 'chats') onToggleAddContact();
          }}
          size="icon" 
          className="w-14 h-14 rounded-2xl bg-accent-primary shadow-xl shadow-accent-primary/20 hover:scale-105 transition-transform"
        >
          {activeTab === 'chats' && <UserPlus className="w-6 h-6 text-white" />}
          {activeTab === 'status' && <Camera className="w-6 h-6 text-white" />}
          {activeTab === 'calls' && <Phone className="w-6 h-6 text-white" />}
        </Button>
      </div>
    </div>
  );
}

