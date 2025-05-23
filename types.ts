import { User as FirebaseUser } from 'firebase/auth';

export interface QuizQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string; // "A", "B", "C", or "D"
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl?: string; // Optional: if the question is about an image
  simplifiedExplanation?: string; // For ELI5 feature
}

export interface Quiz {
  id?: string; // Firestore document ID
  topic: string;
  questions: QuizQuestion[];
  isTimed?: boolean; 
  timePerQuestion?: number; 
  createdBy?: string; // userId of creator
  createdAt?: string; // ISO string
}

export interface QuizConfig {
  topicOrText: string;
  numQuestions: number;
  bloomLevel?: string;
  isTimed?: boolean;
  // For sharing
  isPublic?: boolean; 
  enableProctoring?: boolean; // Conceptual proctoring flag
}

export interface QuizAttempt {
  id: string; // Firestore document ID for this attempt (could be userId if one attempt per quiz per user)
  quizId: string; // ID of the Quiz document in Firestore
  sharedQuizId?: string; // ID of the SharedQuiz session, if applicable
  userId: string; // Firebase Auth User ID
  quizSnapshot: Quiz; // Store the actual quiz taken for historical review
  userAnswers: Record<number, string>; 
  score: number;
  timestamp: string; // ISO string
  topic: string;
  numQuestions: number;
  correctAnswersCount: number; 
  isTimedQuiz: boolean; 
}

export interface SharedQuiz {
  id: string; // Firestore document ID for this shared session
  quizId: string; // ID of the original Quiz document in Firestore
  creatorId: string; // userId of who shared it
  creatorDisplayName?: string; // Optional: denormalized for easier display
  createdAt: string; // ISO string
  topic: string; // Denormalized from original quiz for easier display
  numQuestions: number; // Denormalized
  isTimed: boolean; // Denormalized
  timePerQuestion?: number; // Denormalized
  proctored: boolean; // Conceptual proctoring enabled
  // You could add a title/description for the shared session here
}

export interface SharedQuizAttempt {
  id?: string; // Firestore document ID for this attempt (usually userId)
  userId: string;
  userDisplayName: string; // For leaderboard
  score: number;
  numQuestions: number;
  timestamp: string; // ISO string of when attempt was completed
}

export type LeaderboardEntry = SharedQuizAttempt;


export type ViewState = 
  'landing' | 'form' | 'quiz' | 'results' | 
  'history' | 'loading' | 'achievements' | 
  'login' | 'signup' | 'sharedQuizView' | 'leaderboard';

export interface GeminiQuizResponse {
  topic: string;
  questions: Array<{
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctAnswer: string;
    explanation: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    imageUrl?: string;
  }>;
}

export const BLOOM_TAXONOMY_LEVELS = [
  { value: "", label: "Default (Mixed Difficulty)" },
  { value: "Knowledge", label: "Knowledge (Remembering facts)" },
  { value: "Comprehension", label: "Comprehension (Understanding concepts)" },
  { value: "Application", label: "Application (Using information in new situations)" },
  { value: "Analysis", label: "Analysis (Breaking information into component parts)" },
  { value: "Synthesis", label: "Synthesis (Combining parts to make a new whole)" },
  { value: "Evaluation", label: "Evaluation (Judging the value of information or ideas)" },
];

export const SURPRISE_ME_TOPICS = [
  "The Roman Empire", "Basics of Quantum Physics", "Famous Artists of the Renaissance",
  "The Human Brain", "Climate Change Causes and Effects", "World War II Key Events",
  "The Solar System", "Introduction to Python Programming", "Ancient Egyptian Mythology",
  "The Discovery of Penicillin"
];

export const DEFAULT_TIME_PER_QUESTION = 30; // seconds

export type AITutorMode = 'standard' | 'socratic';

export interface ChatMessage {
  id: string; 
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  simplifiedText?: string; 
  isSimplifying?: boolean; 
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; 
  criteria: (progress: UserProgress, quizHistory: QuizAttempt[]) => boolean;
}

export interface UserProgress {
  userId?: string; // Tie progress to user
  awardedBadgeIds: string[];
  completedTopics: Set<string>; 
  totalCorrectAnswers: number;
  totalQuizzesTaken: number;
  completedTimedQuiz: boolean;
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
  awardedBadgeIds: [],
  completedTopics: new Set<string>(),
  totalCorrectAnswers: 0,
  totalQuizzesTaken: 0,
  completedTimedQuiz: false,
};

// Firebase User (extended slightly if needed, or use FirebaseUser directly)
export type AppUser = FirebaseUser;
