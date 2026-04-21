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
  Image,
  Phone,
  Mail
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
  const [phone, setPhone] = useState(profile?.phone || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio || 'Available');
      setPhone(profile.phone || '');
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
    
    // Clean phone number but keep '+'
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Instant local update
    updateProfile({ displayName, bio, phone: cleanPhone });

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        bio,
        phone: cleanPhone
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
      className="w-full flex items-center gap-5 p-5 hover:bg-white/5 transition-all text-left group relative overflow-hidden"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-dim group-hover:text-accent-primary group-hover:bg-accent-primary/10 transition-all">
        <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-foreground tracking-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-text-dim truncate font-medium">{subtitle}</p>}
      </div>
      {rightElement || <ChevronRight className="w-5 h-5 text-text-dimmer group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />}
    </button>
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-y-0 right-0 w-full md:w-[420px] bg-sidebar/95 backdrop-blur-2xl border-l border-white/5 z-[100] flex flex-col shadow-premium"
    >
      {/* Header */}
      <div className="p-8 flex items-center gap-6 border-b border-white/5 bg-white/5">
        {view !== 'main' && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setView('main')} 
            className="w-10 h-10 rounded-xl text-text-dim hover:text-foreground hover:bg-white/5 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-primary mb-1">
            {view === 'main' ? 'ZapTalk' : 'Settings'}
          </h2>
          <h3 className="text-xl font-black text-foreground tracking-tight">
            {view === 'main' ? 'Profile & Preferences' : view.charAt(0).toUpperCase() + view.slice(1)}
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="w-10 h-10 rounded-xl text-text-dim hover:text-foreground hover:bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="divide-y divide-white/5"
            >
              {/* Profile Summary */}
              <button 
                onClick={() => setView('profile')}
                className="w-full p-8 flex items-center gap-5 hover:bg-white/5 transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                   <Avatar className="w-20 h-20 border-2 border-white/10 shadow-premium ring-4 ring-white/5 group-hover:ring-accent-primary/20 transition-all">
                    <AvatarImage src={profile?.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-sidebar-accent text-accent-primary text-xl font-black">{profile?.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent-primary rounded-full border-4 border-sidebar" />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <h3 className="text-xl font-black text-foreground truncate tracking-tight">{profile?.displayName}</h3>
                  <p className="text-sm text-text-dim truncate font-medium">{profile?.bio || 'Available'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary px-2 py-0.5 bg-accent-primary/10 rounded-full">Pro User</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dimmer">@verified</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-text-dimmer group-hover:text-accent-primary transition-all" />
              </button>

              <div className="py-2">
                <SettingItem 
                  icon={User} 
                  title="Profile Identity" 
                  subtitle="Name, BIO, and personal details" 
                  onClick={() => setView('profile')}
                />
                <SettingItem icon={Lock} title="Privacy Vault" subtitle="Encryption, ghost mode, visibility" onClick={() => setView('privacy')} />
                <SettingItem icon={Bot} title="ZapTalk Intelligence" subtitle="AI Auto-replies, smart chips" onClick={() => setView('ai')} />
                <SettingItem icon={Zap} title="AI Engine Config" subtitle="Manage your API keys" onClick={() => setView('keys')} />
                <SettingItem icon={Bell} title="Alerts & Logic" subtitle="Notification behaviors" onClick={() => setView('notifications')} />
                <SettingItem icon={Palette} title="Aesthetics" subtitle="Interface colors, wallpapers" onClick={() => setView('theme')} />
                <SettingItem icon={Smartphone} title="Native Integration" subtitle="Install as local application" onClick={() => setView('install')} />
                <SettingItem icon={HelpCircle} title="Support Center" subtitle="Updates and help guides" onClick={() => setView('help')} />
              </div>

              <div className="p-6">
                <Button 
                  variant="ghost" 
                  className="w-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 justify-center h-14 rounded-2xl font-black uppercase tracking-widest text-xs border border-transparent hover:border-rose-500/20 transition-all"
                  onClick={() => auth.signOut()}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Terminate Session
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
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-4 p-8 bg-sidebar">
                <div className="relative group">
                  <Avatar className="w-44 h-44 border-4 border-sidebar-accent shadow-2xl ring-1 ring-accent-primary/20">
                    <AvatarImage src={profile?.photoURL} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-zinc-800 text-zinc-400">{profile?.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-8 h-8 text-white" />
                      <span className="text-[10px] text-white font-bold uppercase tracking-widest">Change</span>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-sidebar px-6 py-6 pb-20 space-y-8">
                <div className="space-y-4 border-b border-sidebar-border/30 pb-6">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Your Name
                  </Label>
                  <Input 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-sidebar-accent/50 border-none h-12 rounded-xl focus:ring-1 ring-accent-primary"
                    placeholder="Enter your name"
                  />
                  <p className="text-[11px] text-text-dim px-1 leading-relaxed">This is not your username or pin. This name will be visible to your ZapTalk contacts.</p>
                </div>

                <div className="space-y-4 border-b border-sidebar-border/30 pb-6">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    About
                  </Label>
                  <Input 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-sidebar-accent/50 border-none h-12 rounded-xl focus:ring-1 ring-accent-primary"
                    placeholder="Tell us about yourself"
                  />
                </div>

                <div className="space-y-4 border-b border-sidebar-border/30 pb-6">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    Phone Number
                  </Label>
                  <Input 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-sidebar-accent/50 border-none h-12 rounded-xl focus:ring-1 ring-accent-primary"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </Label>
                  <Input 
                    value={profile?.email}
                    disabled
                    className="bg-sidebar-accent/30 border-none h-12 rounded-xl opacity-60 text-text-dim"
                  />
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={updating || (displayName === profile?.displayName && bio === profile?.bio && phone === profile?.phone)}
                  className="w-full h-12 rounded-xl bg-accent-primary hover:opacity-90 text-white font-bold shadow-lg shadow-accent-primary/20"
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

          {view === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-dim">
                  <Lock className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Privacy & Security</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 bg-accent-primary/10 rounded-2xl border border-accent-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-accent-primary">Ghost Mode</p>
                        <p className="text-[10px] text-text-dim">Hide online, typing, and read status</p>
                      </div>
                      <Switch 
                        checked={!!profile?.settings?.privacy.ghostMode}
                        onCheckedChange={(checked) => handleUpdateSettings('settings.privacy.ghostMode', checked)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Anti-Delete Messages</p>
                      <p className="text-[10px] text-text-dim">See messages even after they are deleted</p>
                    </div>
                    <Switch 
                      checked={!!profile?.settings?.privacy.antiDelete}
                      onCheckedChange={(checked) => handleUpdateSettings('settings.privacy.antiDelete', checked)}
                    />
                  </div>

                  <Separator className="bg-sidebar-border/30" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Last Seen & Online</p>
                      <p className="text-[10px] text-text-dim">Hide when you were last online</p>
                    </div>
                    <Switch 
                      checked={!!profile?.settings?.privacy.hideOnlineStatus}
                      onCheckedChange={(checked) => handleUpdateSettings('settings.privacy.hideOnlineStatus', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Read Receipts</p>
                      <p className="text-[10px] text-text-dim">Hide blue ticks for everyone</p>
                    </div>
                    <Switch 
                      checked={!!profile?.settings?.privacy.hideReadReceipts}
                      onCheckedChange={(checked) => handleUpdateSettings('settings.privacy.hideReadReceipts', checked)}
                    />
                  </div>
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

