import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  LogOut, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Loader2, 
  Palette, 
  EyeOff, 
  MessageSquare, 
  Bot,
  Type,
  Circle,
  User,
  Info,
  ChevronRight,
  HelpCircle,
  Lock,
  Smartphone,
  ArrowLeft,
  Zap,
  Image
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useUser } from '../context/UserContext';

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useUser();
  const [view, setView] = useState<'main' | 'profile' | 'privacy' | 'notifications' | 'theme' | 'ai' | 'wallpaper' | 'help' | 'install' | 'keys'>('main');
  const [updating, setUpdating] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || 'Available');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio || 'Available');
    }
  }, [profile]);

  const handleUpdateSettings = async (path: string, value: any) => {
    if (!auth.currentUser) return;
    // Instant local update
    const updates: any = {};
    const keys = path.split('.');
    if (keys.length > 1) {
      // Handle nested settings
      const currentSettings = JSON.parse(JSON.stringify(profile?.settings || {}));
      let current: any = currentSettings;
      for (let i = 1; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      updates.settings = currentSettings;
    } else {
      updates[path] = value;
    }
    updateProfile(updates);
    toast.success('Settings updated');
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setUpdating(true);
    
    // Instant local update
    updateProfile({ displayName, bio });

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        bio
      });
      toast.success('Profile updated!');
      setView('main');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    updateProfile({ photoURL: localUrl });

    setUpdating(true);
    try {
      const avatarRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: url
      });
      updateProfile({ photoURL: url });
      toast.success('Avatar updated!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUpdating(false);
    }
  };

  const colors = ['#00a884', '#3d5afe', '#f43f5e', '#8b5cf6', '#f59e0b'];

  const SettingItem = ({ icon: Icon, title, subtitle, onClick, rightElement }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-sidebar-accent/50 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-text-dim group-hover:text-accent-primary transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-text-dim truncate">{subtitle}</p>}
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-text-dim" />}
    </button>
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-y-0 right-0 w-full md:w-[380px] bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-sidebar-border bg-sidebar-accent/30">
        {view !== 'main' && (
          <Button variant="ghost" size="icon" onClick={() => setView('main')} className="text-text-dim hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h2 className="text-xl font-bold flex-1">
          {view === 'main' ? 'Settings' : view.charAt(0).toUpperCase() + view.slice(1)}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-text-dim hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="divide-y divide-sidebar-border/50"
            >
              {/* Profile Summary */}
              <button 
                onClick={() => setView('profile')}
                className="w-full p-6 flex items-center gap-4 hover:bg-sidebar-accent/50 transition-colors text-left"
              >
                <Avatar className="w-16 h-16 border-2 border-sidebar-accent shadow-lg">
                  <AvatarImage src={profile?.photoURL} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">{profile?.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate">{profile?.displayName}</h3>
                  <p className="text-sm text-text-dim truncate">{profile?.bio || 'Available'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-dim" />
              </button>

              <div className="py-2">
                <SettingItem icon={User} title="Account" subtitle="Security notifications, change number" />
                <SettingItem icon={Lock} title="Privacy" subtitle="Last seen, profile photo, groups" onClick={() => setView('privacy')} />
                <SettingItem icon={Bot} title="AI Features" subtitle="Reply suggestions, AI assistant" onClick={() => setView('ai')} />
                <SettingItem icon={Zap} title="AI Key Setup" subtitle="Where to paste your API keys" onClick={() => setView('keys')} />
                <SettingItem icon={Bell} title="Notifications" subtitle="Message, group & call tones" onClick={() => setView('notifications')} />
                <SettingItem icon={Palette} title="Theme" subtitle="Dark, light, wallpapers" onClick={() => setView('theme')} />
                <SettingItem icon={Smartphone} title="Install App" subtitle="How to use ZapTalk on your phone" onClick={() => setView('install')} />
                <SettingItem icon={HelpCircle} title="Help" subtitle="Help center, contact us, privacy policy" onClick={() => setView('help')} />
              </div>

              <div className="p-4">
                <Button 
                  variant="ghost" 
                  className="w-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 justify-start h-12 rounded-xl"
                  onClick={() => auth.signOut()}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-sidebar-accent shadow-2xl">
                    <AvatarImage src={profile?.photoURL} />
                    <AvatarFallback className="text-4xl bg-zinc-800 text-zinc-400">{profile?.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-dim">Click to change profile photo</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest">Your Name</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-sidebar-accent border-none h-12 rounded-xl"
                      placeholder="Enter your name"
                    />
                  </div>
                  <p className="text-[10px] text-text-dim px-1">This is not your username or pin. This name will be visible to your ZapTalk contacts.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest">About</Label>
                  <Input 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-sidebar-accent border-none h-12 rounded-xl"
                    placeholder="Tell us about yourself"
                  />
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={updating || (displayName === profile?.displayName && bio === profile?.bio)}
                  className="w-full h-12 rounded-xl bg-accent-primary hover:opacity-90 text-white font-bold"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'theme' && (
            <motion.div
              key="theme"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-dim">
                  <Palette className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Appearance</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Primary Color</p>
                    <div className="flex gap-3">
                      {colors.map(color => (
                        <button 
                          key={color}
                          onClick={() => handleUpdateSettings('settings.customization.primaryColor', color)}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 transition-all shadow-lg",
                            profile?.settings?.customization.primaryColor === color ? "border-white scale-110 ring-2 ring-accent-primary/20" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Theme Mode</p>
                      <p className="text-[10px] text-text-dim">Switch between light and dark backgrounds</p>
                    </div>
                    <div className="flex bg-sidebar-accent p-1 rounded-lg">
                      <button 
                        onClick={() => handleUpdateSettings('settings.customization.theme', 'light')}
                        className={cn("p-1.5 rounded-md transition-all", profile?.settings?.customization.theme === 'light' ? "bg-white text-black shadow-sm" : "text-text-dim")}
                      >
                        <Sun className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleUpdateSettings('settings.customization.theme', 'dark')}
                        className={cn("p-1.5 rounded-md transition-all", profile?.settings?.customization.theme === 'dark' ? "bg-sidebar-border text-white shadow-sm" : "text-text-dim")}
                      >
                        <Moon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Separator className="bg-sidebar-border/30" />

                  <SettingItem 
                    icon={Image} 
                    title="Chat Wallpaper" 
                    subtitle="Change chat background" 
                    onClick={() => setView('wallpaper')} 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'wallpaper' && (
            <motion.div
              key="wallpaper"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&auto=format&fit=crop',
                  'none'
                ].map((url) => (
                  <button
                    key={url}
                    onClick={() => handleUpdateSettings('settings.customization.wallpaper', url)}
                    className={cn(
                      "aspect-[9/16] rounded-xl border-2 overflow-hidden transition-all relative group",
                      profile?.settings?.customization.wallpaper === url ? "border-accent-primary scale-95" : "border-transparent"
                    )}
                  >
                    {url === 'none' ? (
                      <div className="w-full h-full bg-sidebar-accent flex items-center justify-center text-text-dim text-xs font-bold">
                        Default
                      </div>
                    ) : (
                      <img src={url} alt="Wallpaper" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    )}
                    {profile?.settings?.customization.wallpaper === url && (
                      <div className="absolute inset-0 bg-accent-primary/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'install' && (
            <motion.div
              key="install"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="p-4 bg-accent-primary/10 rounded-2xl border border-accent-primary/20 text-center space-y-3">
                <Smartphone className="w-12 h-12 text-accent-primary mx-auto" />
                <h3 className="font-bold">ZapTalk PWA (Recommended)</h3>
                <p className="text-xs text-text-dim">PWAs offer a seamless app experience without downloading from Play Store.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px]">1</div>
                    For Android (Chrome)
                  </h4>
                  <p className="text-xs text-text-dim leading-relaxed ml-8">
                    Open this app in Chrome. Tap the 3 dots (⋮) in the top-right corner. Select <strong>'Add to Home screen'</strong> or <strong>'Install app'</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px]">2</div>
                    For iPhone (Safari)
                  </h4>
                  <p className="text-xs text-text-dim leading-relaxed ml-8">
                    Open this app in Safari. Tap the <strong>Share</strong> button (arrow in box) at the bottom. Scroll down and tap <strong>'Add to Home Screen'</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px]">3</div>
                    For Desktop
                  </h4>
                  <p className="text-xs text-text-dim leading-relaxed ml-8">
                    Tap the <strong>Install</strong> icon in the address bar of your browser (usually on the right side).
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'keys' && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-amber-500" />
                  <h3 className="font-bold">Security Guide</h3>
                </div>
                <p className="text-xs text-text-dim leading-relaxed">
                  To keep your account secure, API keys are managed through the <strong>"Settings"</strong> menu of the build platform, not inside the app's UI.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-accent-primary">Steps to Setup AI</h4>
                  <div className="space-y-4">
                    <div className="bg-sidebar-accent p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold">1. Open Builder Settings</p>
                      <p className="text-[10px] text-text-dim">In the left menu of the AI Studio window where you see the chat and code, find the <strong>⚙️ Settings</strong> icon at the bottom.</p>
                    </div>
                    <div className="bg-sidebar-accent p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold">2. Paste Your Keys</p>
                      <p className="text-[10px] text-text-dim leading-relaxed">
                        Find <strong>'GROK_API_KEY'</strong> in the list and paste your key from x.ai. For Gemini features, paste your <strong>'GEMINI_API_KEY'</strong>.
                      </p>
                    </div>
                    <div className="bg-sidebar-accent p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold">3. Refresh the App</p>
                      <p className="text-[10px] text-text-dim">Once saved, the app will automatically restart and the AI features will be active!</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="space-y-4">
                <div className="p-4 bg-sidebar-accent rounded-xl">
                  <p className="text-sm font-bold">Privacy Policy</p>
                  <p className="text-[10px] text-text-dim mt-1">ZapTalk uses end-to-end encryption for all messages. Your data belongs to you.</p>
                </div>
                <div className="p-4 bg-sidebar-accent rounded-xl">
                  <p className="text-sm font-bold">Terms of Service</p>
                  <p className="text-[10px] text-text-dim mt-1">By using ZapTalk, you agree to respect community guidelines and not engage in spamming.</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-dim">
                  <Bot className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">AI Enhancements</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">AI Reply Suggestions</p>
                      <p className="text-[10px] text-text-dim">Show smart reply chips below messages</p>
                    </div>
                    <Switch 
                      checked={!!profile?.settings?.aiSuggestionsEnabled} 
                      onCheckedChange={(checked) => handleUpdateSettings('settings.aiSuggestionsEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">AI Auto Reply Mode</p>
                      <p className="text-[10px] text-text-dim">Automatically reply to messages using AI</p>
                    </div>
                    <Switch 
                      checked={!!profile?.settings?.aiAutoReplyEnabled} 
                      onCheckedChange={(checked) => handleUpdateSettings('settings.aiAutoReplyEnabled', checked)}
                    />
                  </div>

                  <div className="p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-4 h-4 text-accent-primary" />
                      <p className="text-xs font-bold">Meta AI Assistant</p>
                    </div>
                    <p className="text-[10px] text-text-dim leading-relaxed">
                      Your AI assistant is always available in your chat list. You can also mention @ai in any group or private chat to get instant answers.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

