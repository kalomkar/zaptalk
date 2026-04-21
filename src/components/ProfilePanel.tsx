import React from 'react';
import { motion } from 'motion/react';
import { X, Mail, Phone, Info, Calendar, Clock, Bell, Shield, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfilePanelProps {
  user: UserProfile | null;
  onClose: () => void;
  isOpen: boolean;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onClose, isOpen }) => {
  if (!user) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 h-full w-[350px] bg-sidebar border-l border-sidebar-border z-50 shadow-2xl overflow-hidden flex flex-col"
    >
      <div className="p-4 flex items-center gap-4 border-b border-sidebar-border bg-sidebar h-[60px]">
        <button 
          onClick={onClose}
          className="p-1 hover:bg-sidebar-accent rounded-full transition-colors text-text-dim hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-bold text-[16px]">Contact Info</span>
      </div>

      <ScrollArea className="flex-1 bg-sidebar-accent/10">
        <div className="flex flex-col items-center pt-8 pb-4 bg-sidebar">
          <Avatar className="w-52 h-52 border-4 border-sidebar-border shadow-2xl mb-6 ring-1 ring-accent-primary/20">
            <AvatarImage src={user.photoURL} className="object-cover" />
            <AvatarFallback className="text-5xl text-zinc-400 bg-zinc-800">
              {user.displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold text-center text-foreground">{user.displayName}</h2>
          <p className="text-text-dim text-sm mt-1">
            {user.phone || '+91 98765 43210'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-text-dim text-xs">
            {user.status === 'online' ? (
              <>
                <span className="w-2 h-2 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(0,168,132,0.5)]" />
                <span className="text-accent-primary font-medium">online</span>
              </>
            ) : (
              <span>last seen {user.lastSeen ? format(user.lastSeen, 'HH:mm') : 'recently'}</span>
            )}
          </div>
        </div>

        <div className="mt-3 bg-sidebar space-y-0.5">
          {/* About Section */}
          <div className="px-6 py-4 border-b border-sidebar-border/30">
            <span className="text-[12px] text-accent-primary font-bold uppercase tracking-wider block mb-2">About</span>
            <p className="text-foreground text-[14px] leading-relaxed font-medium">
              {user.bio || 'Available'}
            </p>
          </div>

          {/* Contact Details Section */}
          <div className="px-6 py-4 border-b border-sidebar-border/30">
             <span className="text-[12px] text-accent-primary font-bold uppercase tracking-wider block mb-4">Contact Info</span>
             <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-text-dim mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[14px] text-foreground font-medium">{user.email || 'N/A'}</p>
                    <p className="text-[11px] text-text-dim mt-0.5 uppercase tracking-wider font-bold">Email</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-text-dim mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[14px] text-foreground font-medium">{user.phone || '+91 98765 43210'}</p>
                    <p className="text-[11px] text-text-dim mt-0.5 uppercase tracking-wider font-bold">Phone</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-text-dim mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[14px] text-foreground font-medium">@{user.displayName?.toLowerCase().replace(/\s/g, '_')}</p>
                    <p className="text-[11px] text-text-dim mt-0.5 uppercase tracking-wider font-bold">Username</p>
                  </div>
                </div>
             </div>
          </div>

          {/* Media, Links & Docs Section */}
          <button className="w-full px-6 py-4 border-b border-sidebar-border/30 flex items-center justify-between hover:bg-sidebar-accent/30 transition-colors">
            <span className="text-foreground text-[14px] font-medium">Media, links and docs</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-dim">45</span>
               <Calendar className="w-4 h-4 text-text-dim" />
            </div>
          </button>
        </div>

        <div className="mt-3 bg-sidebar space-y-0.5 mb-8">
            <Button variant="ghost" className="w-full justify-start gap-4 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-none h-14 px-8 border-b border-sidebar-border/30">
                <Shield className="w-5 h-5" />
                <span className="font-medium text-[15px]">Block {user.displayName}</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-4 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-none h-14 px-8">
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-[15px]">Report Contact</span>
            </Button>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
