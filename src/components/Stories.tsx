import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Story, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [uploading, setUploading] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useEffect(() => {
    const now = Date.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setStories(storyData);

      // Fetch user profiles for stories
      storyData.forEach(async (story) => {
        if (!userProfiles[story.userId]) {
          const userSnap = await getDoc(doc(db, 'users', story.userId));
          if (userSnap.exists()) {
            setUserProfiles(prev => ({ ...prev, [story.userId]: userSnap.data() as UserProfile }));
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

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

      toast.success('Story posted!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border-b border-sidebar-border overflow-x-auto">
      <div className="flex gap-4 items-center min-w-max">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <Avatar className="w-14 h-14 border-2 border-accent-primary p-0.5">
              <AvatarImage src={auth.currentUser?.photoURL || ''} />
              <AvatarFallback>{auth.currentUser?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-accent-primary text-white rounded-full p-1 cursor-pointer border-2 border-sidebar shadow-lg">
              <Plus className="w-3 h-3" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file?.type?.startsWith('image/')) handleUploadStory(e, 'image');
                  else if (file?.type?.startsWith('video/')) handleUploadStory(e, 'video');
                }}
              />
            </label>
          </div>
          <span className="text-[10px] font-medium text-text-dim">My Story</span>
        </div>

        {/* Story List */}
        {stories.map(story => (
          <div 
            key={story.id} 
            className="flex flex-col items-center gap-1 cursor-pointer"
            onClick={() => setSelectedStory(story)}
          >
            <div className="w-14 h-14 rounded-full border-2 border-accent-secondary p-0.5">
              <Avatar className="w-full h-full">
                <AvatarImage src={story.content} className="object-cover" />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[10px] font-medium text-text-dim truncate w-14 text-center">
              User
            </span>
          </div>
        ))}

        {uploading && (
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-accent-primary flex items-center justify-center animate-spin">
            <Loader2 className="w-6 h-6 text-accent-primary" />
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <button 
              onClick={() => setSelectedStory(null)}
              className="absolute top-6 right-6 text-white hover:text-accent-primary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="w-full max-w-lg h-full max-h-[80vh] relative">
              {selectedStory.type === 'image' ? (
                <img 
                  src={selectedStory.content} 
                  alt="Story" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <video 
                  src={selectedStory.content} 
                  autoPlay 
                  controls 
                  className="w-full h-full object-contain"
                />
              )}
              
              <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  onAnimationComplete={() => setSelectedStory(null)}
                  className="h-full bg-accent-primary"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
