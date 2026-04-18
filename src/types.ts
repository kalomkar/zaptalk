export interface UserSettings {
  privacy: {
    hideOnlineStatus: boolean;
    hideTypingStatus: boolean;
    hideReadReceipts: boolean;
  };
  customization: {
    theme: string;
    fontFamily: string;
    bubbleStyle: 'rounded' | 'sharp' | 'sleek';
    primaryColor: string;
    wallpaper?: string;
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
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen: number;
  bio?: string;
  settings?: UserSettings;
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
  scheduledFor?: number;
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
}
