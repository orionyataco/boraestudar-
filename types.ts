export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  role?: string;
  status?: 'online' | 'offline';
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  user: User;
  subject: string;
  description: string;
  timeAgo: string;
  likes: number;
  likedBy: string[]; // Track user IDs who liked
  comments: number;
  commentsList?: Comment[];
  imageStart?: string;
  imageEnd?: string;
  duration?: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  answeredBy: string[]; // IDs of users who answered
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type: 'text' | 'file' | 'system' | 'quiz';
  fileName?: string;
  quiz?: QuizData;
  userName?: string;
  userAvatar?: string;
  userAnswer?: {
    optionIndex: number;
    isCorrect: boolean;
  };
}

export interface RankingUser {
  rank: number;
  user: User;
  hours: number;
  points: number; // Added points for quiz gamification
  trend: 'up' | 'down' | 'neutral';
}

export enum Page {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  PROFILE = 'PROFILE',
  CHAT = 'CHAT',
  RANKING = 'RANKING',
  EDIT_PROFILE = 'EDIT_PROFILE',
  SETTINGS = 'SETTINGS',
  FEED = 'FEED',
  GROUPS = 'GROUPS',
  GROUP_DETAIL = 'GROUP_DETAIL',
  ACCOUNT_SETTINGS = 'ACCOUNT_SETTINGS',
}