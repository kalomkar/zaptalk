import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, Camera, Loader2, Mail, Search, Bot, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

import { useUser } from '../context/UserContext';
import { UserProfile } from '../types';

export default function AddContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addContact } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<(UserProfile & { id: string }) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!email && !phone) return toast.error('Enter email or phone to search');
    setLoading(true);
    try {
      // Clean phone number (remove spaces, dashes)
      const cleanPhone = phone.replace(/\D/g, '');
      
      let q;
      if (email) {
        q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      } else {
        // Try both formats (original and cleaned)
        q = query(collection(db, 'users'), where('phone', 'in', [phone, cleanPhone]));
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data() as UserProfile;
        const fullUserData = { ...userData, id: snap.docs[0].id };
        setSearchResult(fullUserData);
        setName(userData.displayName || '');
        setAvatar(userData.photoURL || '');
        toast.success(`User found: ${userData.displayName || 'Unnamed User'}`);
      } else {
        toast.info('No user registered with this info. You can still save it as a local contact.');
        setSearchResult(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAIBot = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const aiChatId = `ai_${auth.currentUser.uid}`;
      await setDoc(doc(db, 'chats', aiChatId), {
        id: aiChatId,
        type: 'one-to-one',
        participants: [auth.currentUser.uid, 'ai-assistant'],
        lastMessage: {
          id: `welcome_ai_${auth.currentUser.uid}`,
          senderId: 'ai-assistant',
          text: 'Hello! I am your ZapTalk AI assistant. How can I help you today?',
          timestamp: Date.now(),
          type: 'ai',
          status: 'sent',
          isEncrypted: false
        },
        unreadCount: { [auth.currentUser.uid]: 0 },
        updatedAt: Date.now()
      }, { merge: true });
      
      toast.success('AI Assistant added to your chats!');
      onClose();
    } catch (error) {
      toast.error('Failed to add AI assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!email && !phone)) {
      return toast.error('Please fill in required fields');
    }

    setLoading(true);
    try {
      const isRealUser = !!searchResult;
      const chatId = isRealUser 
        ? [auth.currentUser!.uid, searchResult.id].sort().join('_')
        : `local_${Date.now()}`;

      const newContact = {
        id: chatId,
        name: name,
        email: email,
        phone: phone,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        participants: [auth.currentUser?.uid, isRealUser ? searchResult.id : chatId],
        type: 'one-to-one',
        lastMessage: {
          id: `msg_${Date.now()}`,
          senderId: isRealUser ? searchResult.id : chatId,
          text: 'Start chatting',
          timestamp: Date.now(),
          type: 'text',
          status: 'seen',
          isEncrypted: true
        }
      };

      await addContact(newContact);
      
      // If it's a real user, create the chat doc immediately to ensure sync
      if (isRealUser && auth.currentUser) {
        await setDoc(doc(db, 'chats', chatId), {
          id: chatId,
          type: 'one-to-one',
          participants: [auth.currentUser.uid, searchResult.id],
          lastMessage: newContact.lastMessage,
          unreadCount: { [auth.currentUser.uid]: 0, [searchResult.id]: 0 },
          updatedAt: Date.now()
        }, { merge: true });
      }

      toast.success('Contact added!');
      onClose();
      setName('');
      setEmail('');
      setPhone('');
      setAvatar('');
      setSearchResult(null);
    } catch (error) {
      toast.error('Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-sidebar/95 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-premium overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-primary mb-1">Connection</h2>
                <h3 className="text-2xl font-black text-foreground tracking-tight underline decoration-accent-primary/30 decoration-4 underline-offset-4">Add Contact</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="w-10 h-10 rounded-2xl text-text-dim hover:text-foreground hover:bg-white/5 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 scroll-smooth overflow-y-auto max-h-[70vh]">
              {/* AI Option */}
              <div className="space-y-4">
                <button 
                  type="button" 
                  onClick={handleAddAIBot}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative glass-dark border border-white/5 rounded-2xl p-5 flex items-center justify-between transition-all group-hover:bg-white/10 active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent-primary/20 rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6 text-accent-primary" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-foreground text-[16px]">ZapTalk AI Assistant</h4>
                        <p className="text-[10px] text-accent-primary font-black uppercase tracking-widest mt-0.5">Powered by GPT-4o</p>
                      </div>
                    </div>
                    <Zap className="w-5 h-5 text-accent-primary fill-accent-primary animate-pulse" />
                  </div>
                </button>

                <div className="flex items-center gap-4 px-4">
                  <div className="h-[1px] flex-1 bg-white/5" />
                  <span className="text-[10px] text-text-dim uppercase tracking-[0.3em] font-black">or create contact</span>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                {searchResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-5 glass border border-accent-primary/30 rounded-2xl flex items-center gap-4 mb-4"
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-accent-primary shadow-premium ring-4 ring-accent-primary/10">
                        <AvatarImage src={searchResult.photoURL} />
                        <AvatarFallback className="bg-sidebar-accent text-accent-primary font-black">
                          {searchResult.displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent-primary rounded-full border-2 border-sidebar flex items-center justify-center">
                        <Check className="w-3 h-3 text-black font-bold" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-foreground truncate text-[17px] tracking-tight">{searchResult.displayName || 'User Found'}</h4>
                      <p className="text-[10px] text-accent-primary font-black uppercase tracking-widest mt-0.5">Registered User</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSearchResult(null)}
                      className="text-text-dim hover:text-rose-500 rounded-lg"
                    >
                      Reset
                    </Button>
                  </motion.div>
                )}

                {!searchResult && (
                  <div className="relative group mx-auto">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-accent-primary/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="w-28 h-28 border-2 border-white/5 shadow-premium relative bg-white/5 ring-4 ring-white/5">
                      <AvatarImage src={avatar} className="object-cover" />
                      <AvatarFallback className="bg-white/5 text-text-dim">
                        <User className="w-12 h-12" />
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm"
                    >
                      <Camera className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </div>
                )}
                <p className="text-[10px] text-text-dimmer uppercase font-black tracking-widest">Profile Identity</p>
              </div>

              {/* Form Inputs */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between mb-2">
                          <Label className="text-[10px] font-black text-text-dimmer uppercase tracking-widest">Direct Search</Label>
                          {loading && <Loader2 className="w-3 h-3 text-accent-primary animate-spin" />}
                       </div>
                       <div className="flex gap-3">
                          <div className="relative flex-1 group/input">
                            <div className="absolute -inset-0.5 bg-accent-primary/20 rounded-2xl opacity-0 group-focus-within/input:opacity-100 blur-sm transition-opacity" />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dimmer" />
                            <Input
                              type="email"
                              placeholder="Search by email..."
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (e.target.value) setPhone(''); 
                              }}
                              className="relative pl-12 bg-white/5 border-white/5 h-14 rounded-2xl focus:bg-white/10 transition-all outline-none"
                            />
                          </div>
                          <Button 
                            type="button" 
                            onClick={handleSearch}
                            disabled={loading || !email}
                            className="h-14 w-14 rounded-2xl bg-accent-primary hover:scale-105 text-black font-black shadow-lg shadow-accent-primary/20 active:scale-95 transition-all"
                          >
                            <Search className="w-6 h-6" />
                          </Button>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-[1px] flex-1 bg-white/5" />
                      <span className="text-[8px] text-text-dimmer font-black tracking-widest">OR</span>
                      <div className="h-[1px] flex-1 bg-white/5" />
                    </div>

                    <div className="space-y-2">
                       <div className="relative group/input">
                          <div className="absolute -inset-0.5 bg-accent-primary/20 rounded-2xl opacity-0 group-focus-within/input:opacity-100 blur-sm transition-opacity" />
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dimmer" />
                          <Input
                            placeholder="Phone: +91 98765 43210"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (e.target.value) setEmail('');
                            }}
                            className="relative pl-12 bg-white/5 border-white/5 h-14 rounded-2xl focus:bg-white/10 transition-all"
                          />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-white/5 my-4" />

                <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-text-dimmer uppercase tracking-widest">Display Identity</Label>
                      <div className="relative group/input">
                        <div className="absolute -inset-0.5 bg-accent-primary/20 rounded-2xl opacity-0 group-focus-within/input:opacity-100 blur-sm transition-opacity" />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dimmer" />
                        <Input
                          placeholder="Contact Nickname"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="relative pl-12 bg-white/5 border-white/5 h-14 rounded-2xl focus:bg-white/10 transition-all font-bold"
                          required
                        />
                      </div>
                      {searchResult && <p className="text-[10px] text-accent-primary/80 pl-1 font-bold animate-pulse">✓ Profile Synced</p>}
                    </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-sidebar/5 backdrop-blur-xl">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 h-14 rounded-2xl text-text-dim hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-black font-black shadow-xl shadow-accent-primary/20 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save Contact'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
