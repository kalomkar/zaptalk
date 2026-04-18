import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MoreVertical, Camera, Phone, Video, UserPlus, Zap, Settings, User, LogOut } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-sidebar border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-primary/10 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">ZapTalk</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-text-dim hover:text-foreground">
            <Camera className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-text-dim hover:text-foreground">
            <Search className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-text-dim hover:text-foreground")}>
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-sidebar border-sidebar-border rounded-xl shadow-2xl">
              <DropdownMenuItem onClick={onToggleAddContact} className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                <UserPlus className="w-4 h-4" /> New Contact
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                <User className="w-4 h-4" /> New Group
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sidebar-border" />
              <DropdownMenuItem onClick={onToggleSettings} className="gap-2 focus:bg-sidebar-accent cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => auth.signOut()} className="gap-2 focus:bg-sidebar-accent cursor-pointer text-rose-500 focus:text-rose-500">
                <LogOut className="w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex bg-sidebar border-b border-sidebar-border/30 relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id ? 'text-accent-primary' : 'text-text-dim hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.count && (
                <span className="bg-accent-primary text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px]">
                  {tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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

