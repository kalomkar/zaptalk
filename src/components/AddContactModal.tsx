import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, Camera, Loader2, Mail, Search, Bot, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

import { useUser } from '../context/UserContext';

export default function AddContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addContact } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!email && !phone) return toast.error('Enter email or phone to search');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where(email ? 'email' : 'phone', '==', email || phone)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setSearchResult({ id: snap.docs[0].id, ...userData });
        setName(userData.displayName || '');
        setAvatar(userData.photoURL || '');
      } else {
        toast.info('User not found. You can still add them as a local contact.');
        setSearchResult(null);
      }
    } catch (error) {
      toast.error('Search failed');
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
      const contactId = searchResult ? searchResult.id : `local_${Date.now()}`;
      const newContact = {
        id: contactId,
        name: name,
        email: email,
        phone: phone,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        participants: [auth.currentUser?.uid, contactId],
        type: 'one-to-one',
        lastMessage: {
          id: `msg_${Date.now()}`, // Added unique ID for React keys
          senderId: contactId,
          text: 'Start chatting',
          timestamp: Date.now(),
          type: 'text',
          status: 'seen',
          isEncrypted: true
        }
      };

      await addContact(newContact);
      
      // If it's a real user, create the chat doc immediately to ensure sync
      if (searchResult && auth.currentUser) {
        const chatId = [auth.currentUser.uid, searchResult.id].sort().join('_');
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-sidebar border border-sidebar-border rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
              <h2 className="text-xl font-bold">Add New Contact</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-text-dim hover:text-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <Button 
                  type="button" 
                  onClick={handleAddAIBot}
                  className="w-full bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 rounded-2xl h-14 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Bot className="w-5 h-5" />
                  <span className="font-bold">Chat with ZapTalk AI</span>
                  <Zap className="w-4 h-4 fill-current" />
                </Button>
                <div className="flex items-center gap-3 w-full my-2">
                  <div className="h-[1px] flex-1 bg-sidebar-border/30" />
                  <span className="text-[10px] text-text-dim uppercase tracking-widest font-bold">or add contact</span>
                  <div className="h-[1px] flex-1 bg-sidebar-border/30" />
                </div>
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-sidebar-accent shadow-lg">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-xs text-text-dim">Upload profile picture (optional)</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search" className="text-sm font-medium">Search by Email</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-sidebar-accent border-none h-12 rounded-xl"
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleSearch}
                        disabled={loading || (!email && !phone)}
                        className="h-12 w-12 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground shrink-0"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Contact Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <Input
                      id="name"
                      placeholder="Enter name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-sidebar-accent border-none h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-sidebar-accent border-none h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl text-text-dim hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-accent-primary hover:opacity-90 text-white font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Contact'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
