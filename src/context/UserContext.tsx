import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Story } from '../types';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDoc } from 'firebase/firestore';

interface UserContextType {
  profile: UserProfile | null;
  localContacts: any[];
  localStories: Story[];
  updateProfile: (updates: Partial<UserProfile>) => void;
  addContact: (contact: any) => void;
  addStory: (story: Story) => void;
  setLocalContacts: (contacts: any[]) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('zap_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [localContacts, setLocalContacts] = useState<any[]>(() => {
    const saved = localStorage.getItem('zap_contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const [localStories, setLocalStories] = useState<Story[]>(() => {
    const saved = localStorage.getItem('zap_stories');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (profile) localStorage.setItem('zap_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('zap_contacts', JSON.stringify(localContacts));
  }, [localContacts]);

  useEffect(() => {
    localStorage.setItem('zap_stories', JSON.stringify(localStories));
  }, [localStories]);

  useEffect(() => {
    const theme = profile?.settings?.customization.theme || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.settings?.customization.theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Sync Profile
        const userDoc = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            
            // Ensure AI Assistant chat exists
            (async () => {
              const aiChatId = `ai_${user.uid}`;
              const aiDoc = doc(db, 'chats', aiChatId);
              const aiSnap = await getDoc(aiDoc);
              if (!aiSnap.exists()) {
                await setDoc(aiDoc, {
                  id: aiChatId,
                  type: 'one-to-one',
                  participants: [user.uid, 'ai-assistant'],
                  lastMessage: {
                    id: `welcome_ai_${user.uid}`,
                    senderId: 'ai-assistant',
                    text: 'Hello! I am your Meta AI assistant. I have been upgraded to Grok-4.20. How can I help you today?',
                    timestamp: Date.now(),
                    type: 'ai',
                    status: 'sent',
                    isEncrypted: false
                  },
                  unreadCount: { [user.uid]: 0 }
                });
              }
            })();
          } else {
            (async () => {
              // Create initial profile if not exists
              const initialProfile: UserProfile = {
                uid: user.uid,
                displayName: user.displayName || 'User',
                email: user.email || '',
                photoURL: user.photoURL || '',
                status: 'online',
                lastSeen: Date.now(),
                bio: 'Hey there! I am using ZapTalk.',
                settings: {
                  privacy: {
                    hideOnlineStatus: false,
                    hideTypingStatus: false,
                    hideReadReceipts: false,
                  },
                  notifications: {
                    messageSounds: true,
                    groupSounds: true,
                    showPreviews: true,
                  },
                  customization: {
                    theme: 'dark',
                    primaryColor: '#00a884',
                    bubbleStyle: 'sleek',
                    fontFamily: 'Inter',
                  },
                  autoReply: {
                    enabled: false,
                    message: "I'm currently busy. I'll get back to you soon!",
                  },
                  aiSuggestionsEnabled: true,
                  aiAutoReplyEnabled: false,
                },
              };
              await setDoc(userDoc, initialProfile);
              setProfile(initialProfile);

              // Create initial AI chat
              const aiChatId = `ai_${user.uid}`;
              await setDoc(doc(db, 'chats', aiChatId), {
                id: aiChatId,
                type: 'one-to-one',
                participants: [user.uid, 'ai-assistant'],
                lastMessage: {
                  id: `welcome_ai_${user.uid}`,
                  senderId: 'ai-assistant',
                  text: 'Welcome to ZapTalk! I am your Meta AI assistant. Type @ai followed by your message in any chat, or talk to me directly here.',
                  timestamp: Date.now(),
                  type: 'ai',
                  status: 'sent',
                  isEncrypted: false
                },
                unreadCount: { [user.uid]: 1 }
              });
            })();
          }
        });

        // Sync Contacts
        const contactsRef = collection(db, 'users', user.uid, 'contacts');
        const unsubContacts = onSnapshot(contactsRef, (snapshot) => {
          const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (contacts.length > 0) {
            setLocalContacts(contacts);
          }
        });

        return () => {
          unsubDoc();
          unsubContacts();
        };
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
    }
  };

  const addContact = async (contact: any) => {
    setLocalContacts(prev => [contact, ...prev]);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'contacts', contact.id), contact);
      } catch (error) {
        console.error("Failed to sync contact:", error);
      }
    }
  };

  const addStory = (story: Story) => {
    setLocalStories(prev => [story, ...prev]);
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      localContacts, 
      localStories, 
      updateProfile, 
      addContact, 
      addStory,
      setLocalContacts
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
