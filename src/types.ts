export interface UserSettings {
  privacy: {
    hideOnlineStatus: boolean;
    hideTypingStatus: boolean;
    hideReadReceipts: boolean;
    ghostMode: boolean; // hide everything
    antiDelete: boolean; // see deleted messages
  };
  customization: {
    theme: string;
    fontFamily: string;
    bubbleStyle: 'rounded' | 'sharp' | 'sleek';
    primaryColor: string;
    wallpaper?: string;
    chatWallpapers?: Record<string, string>; // chatId -> wallpaperUrl
  };
  notifications: {
    messageSounds: boolean;
    groupSounds: boolean;
    showPreviews: boolean;
  };
  autoReply: {
    enabled: boolean;
    message: string;
  };
  aiSuggestionsEnabled: boolean;
  aiAutoReplyEnabled: boolean;
  aiPersonality?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen: number;
  bio?: string;
  settings?: UserSettings;
  pinnedChats?: string[]; // list of chatIds
}

export interface Story {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string; // text or url
  timestamp: number;
  expiresAt: number;
  viewers: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'ai';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  status: 'sent' | 'delivered' | 'seen';
  isEncrypted: boolean;
  isDeleted?: boolean;
  deletedContent?: string; // for anti-delete
  scheduledFor?: number;
  replyTo?: string; // id of message being replied to
  isStarred?: Record<string, boolean>; // userId -> isStarred
  isEdited?: boolean;
}

export interface Chat {
  id: string;
  type: 'one-to-one' | 'group';
  participants: string[];
  lastMessage?: Message;
  unreadCount?: Record<string, number>; // userId -> count
  name?: string; // for group chats
  avatar?: string; // for group chats
  typing?: Record<string, boolean>; // userId -> isTyping
  archivedBy?: string[]; // list of user IDs who archived this chat
  pinnedBy?: string[]; // list of user IDs who pinned this chat
}
