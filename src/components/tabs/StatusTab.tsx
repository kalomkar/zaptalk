import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Story, UserProfile } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useUser } from '../../context/UserContext';

export default function StatusTab() {
  const { profile, localStories, addStory } = useUser();
  const [stories, setStories] = useState<Story[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [uploading, setUploading] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useEffect(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, 'stories'),
      where('timestamp', '>', twentyFourHoursAgo),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      
      const allStories = [...localStories, ...storyData].filter(s => s.timestamp > twentyFourHoursAgo);
      const uniqueStories = allStories.filter((s, index, self) => 
        index === self.findIndex((t) => t.id === s.id)
      );
      
      setStories(uniqueStories);

      // Batch profile fetching
      const uids = Array.from(new Set(uniqueStories.map(s => s.userId)));
      const newProfiles = { ...userProfiles };
      let updated = false;

      for (const uid of uids) {
        if (!newProfiles[uid]) {
          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              newProfiles[uid] = userSnap.data() as UserProfile;
              updated = true;
            }
          } catch (e) {
            console.error('Error fetching story user profile:', e);
          }
        }
      }

      if (updated) {
        setUserProfiles(newProfiles);
      }
    });

    return () => unsubscribe();
  }, [localStories, userProfiles]);

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const localUrl = URL.createObjectURL(file);
    const type = file.type?.startsWith('image/') ? 'image' : 'video';
    
    const newStory: Story = {
      id: `local_${Date.now()}`,
      userId: auth.currentUser.uid,
      type,
      content: localUrl,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      viewers: []
    };

    addStory(newStory);
    toast.success('Status updated!');

    setUploading(true);
    try {
      const storageRef = ref(storage, `stories/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'stories'), {
        userId: auth.currentUser.uid,
        type,
        content: url,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        viewers: []
      });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col py-2">
          {/* My Status */}
          <div className="px-4 py-3 flex items-center gap-4 hover:bg-sidebar-accent/50 cursor-pointer transition-colors relative">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-sidebar-border p-0.5">
                <AvatarImage src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} />
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-accent-primary rounded-full p-0.5 border-2 border-sidebar cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Plus className="w-4 h-4 text-white" />}
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUploadStory} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">My Status</h3>
              <p className="text-sm text-text-dim">Tap to add status update</p>
            </div>
          </div>

          <div className="px-4 py-2">
            <h4 className="text-xs font-bold text-accent-primary uppercase tracking-wider">Recent updates</h4>
          </div>

          {stories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-dim italic">No recent updates from your contacts</p>
            </div>
          ) : (
            stories.map((story) => {
              const user = userProfiles[story.userId];
              return (
                <div
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-accent-primary p-0.5">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.userId}`} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{user?.displayName || 'User'}</h3>
                    <p className="text-sm text-text-dim">
                      {formatDistanceToNow(story.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            key="story-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <button 
              onClick={() => setSelectedStory(null)}
              className="absolute top-6 right-6 text-white hover:text-accent-primary transition-colors z-[110]"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="w-full max-w-lg h-full max-h-[90vh] relative flex items-center justify-center">
              {selectedStory.type === 'image' ? (
                <img 
                  src={selectedStory.content} 
                  alt="Story" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <video 
                  src={selectedStory.content} 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              )}
              
              <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden z-[110]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  onAnimationComplete={() => setSelectedStory(null)}
                  className="h-full bg-accent-primary"
                />
              </div>

              <div className="absolute top-8 left-4 flex items-center gap-3 z-[110]">
                <Avatar className="w-10 h-10 border border-white/20">
                  <AvatarImage src={userProfiles[selectedStory.userId]?.photoURL} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-white font-semibold text-sm">
                    {userProfiles[selectedStory.userId]?.displayName || 'User'}
                  </h4>
                  <p className="text-white/60 text-xs">
                    {formatDistanceToNow(selectedStory.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
