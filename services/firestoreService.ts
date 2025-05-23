import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { 
    UserProgress, QuizAttempt, Quiz, SharedQuiz, SharedQuizAttempt, DEFAULT_USER_PROGRESS 
} from '../types';

const USER_PROGRESS_COLLECTION = 'userProgress';
const QUIZ_HISTORY_COLLECTION = 'quizHistory'; // Per user
const QUIZZES_COLLECTION = 'quizzes'; // Global quizzes
const SHARED_QUIZZES_COLLECTION = 'sharedQuizzes';

function sanitizeFirestoreData(obj: any) {
  if (Array.isArray(obj)) return obj.map(sanitizeFirestoreData);
  if (obj && typeof obj === 'object') {
    const clean: any = {};
    for (const k in obj) {
      if (obj[k] !== undefined && obj[k] !== null) {
        clean[k] = sanitizeFirestoreData(obj[k]);
      }
    }
    return clean;
  }
  return obj;
}

// --- User Progress (Achievements) ---
export const loadUserProgressFromFirestore = async (userId: string): Promise<UserProgress> => {
  try {
    const docRef = doc(db, USER_PROGRESS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...DEFAULT_USER_PROGRESS, // Ensure all fields are present
        ...data,
        userId,
         // Firestore stores array, convert to Set
        completedTopics: new Set(data.completedTopics || []),
        awardedBadgeIds: data.awardedBadgeIds || [],
      } as UserProgress;
    } else {
      // No progress found, return default for this user (should be created on signup)
      // FIX: Ensure Set is of type string for completedTopics
      const defaultProg: UserProgress = { ...DEFAULT_USER_PROGRESS, userId, completedTopics: new Set<string>(), awardedBadgeIds: [] };
      await saveUserProgressToFirestore(userId, defaultProg); // Save it
      return defaultProg;
    }
  } catch (error) {
    console.error("Error loading user progress from Firestore:", error);
    return { ...DEFAULT_USER_PROGRESS, userId, completedTopics: new Set<string>(), awardedBadgeIds: [] };
  }
};

export const saveUserProgressToFirestore = async (userId: string, progress: UserProgress): Promise<void> => {
  try {
    const docRef = doc(db, USER_PROGRESS_COLLECTION, userId);
    // Convert Set to Array for Firestore serialization
    const serializableProgress = {
      ...progress,
      completedTopics: Array.from(progress.completedTopics || new Set<string>()),
      awardedBadgeIds: Array.isArray(progress.awardedBadgeIds) ? progress.awardedBadgeIds : [],
      // Ensure server timestamp for updates if needed, or rely on client timestamp
    };
    await setDoc(docRef, serializableProgress, { merge: true });
  } catch (error) {
    console.error("Error saving user progress to Firestore:", error);
    throw error;
  }
};


// --- Quiz History (User-specific attempts) ---
const MAX_HISTORY_ITEMS_FS = 20;

export const loadQuizHistoryFromFirestore = async (userId: string): Promise<QuizAttempt[]> => {
  try {
    const historyCollectionRef = collection(db, USER_PROGRESS_COLLECTION, userId, QUIZ_HISTORY_COLLECTION);
    const q = query(historyCollectionRef, orderBy('timestamp', 'desc'), limit(MAX_HISTORY_ITEMS_FS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
  } catch (error) {
    console.error("Error loading quiz history from Firestore:", error);
    return [];
  }
};

export const saveQuizAttemptToHistoryInFirestore = async (userId: string, attempt: Omit<QuizAttempt, 'id' | 'timestamp'>): Promise<QuizAttempt> => {
  try {
    // Add new attempt
    const historyCollectionRef = collection(db, USER_PROGRESS_COLLECTION, userId, QUIZ_HISTORY_COLLECTION);
    const attemptWithTimestamp = { ...attempt, timestamp: new Date().toISOString() };
    const docRef = await addDoc(historyCollectionRef, attemptWithTimestamp);
    
    // Enforce MAX_HISTORY_ITEMS_FS limit
    const allHistoryQuery = query(historyCollectionRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(allHistoryQuery);
    if (snapshot.docs.length > MAX_HISTORY_ITEMS_FS) {
      const batch = writeBatch(db);
      const docsToDelete = snapshot.docs.slice(MAX_HISTORY_ITEMS_FS);
      docsToDelete.forEach(docToDelete => batch.delete(docToDelete.ref));
      await batch.commit();
    }
    return { id: docRef.id, ...attemptWithTimestamp };

  } catch (error) {
    console.error("Error saving quiz attempt to Firestore:", error);
    throw error;
  }
};


// --- Global Quizzes ---
export const saveQuizToFirestore = async (quizData: Omit<Quiz, 'id' | 'createdAt'>, userId: string): Promise<Quiz> => {
  try {
    const quizWithMeta = sanitizeFirestoreData({
      ...quizData,
      createdBy: userId,
      createdAt: serverTimestamp()
    });
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), quizWithMeta);
    return { id: docRef.id, ...quizData, createdAt: new Date().toISOString(), createdBy: userId };
  } catch (error) {
    console.error("Error saving quiz to Firestore:", error);
    throw error;
  }
};

export const getQuizFromFirestore = async (quizId: string): Promise<Quiz | null> => {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let createdAt = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') { // Check if it's a Firestore Timestamp
        createdAt = data.createdAt.toDate().toISOString();
      }
      return { id: docSnap.id, ...data, createdAt } as Quiz;
    }
    return null;
  } catch (error) {
    console.error("Error fetching quiz from Firestore:", error);
    throw error;
  }
};

// --- Shared Quizzes & Attempts ---
export const createSharedQuizInFirestore = async (
  quizId: string, 
  creatorId: string, 
  creatorDisplayName: string | null,
  originalQuiz: Quiz, // Pass the original quiz to denormalize some fields
  proctored: boolean
): Promise<SharedQuiz> => {
  try {
    const sharedQuizData: Omit<SharedQuiz, 'id' | 'createdAt'> = sanitizeFirestoreData({
      quizId,
      creatorId,
      creatorDisplayName: creatorDisplayName || undefined,
      topic: originalQuiz.topic,
      numQuestions: originalQuiz.questions.length,
      isTimed: !!originalQuiz.isTimed,
      timePerQuestion: originalQuiz.timePerQuestion,
      proctored,
    });
    const docRef = await addDoc(collection(db, SHARED_QUIZZES_COLLECTION), {
      ...sharedQuizData,
      createdAt: serverTimestamp(),
    });
    return { 
        id: docRef.id, 
        ...sharedQuizData, 
        createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error creating shared quiz in Firestore:", error);
    throw error;
  }
};

export const getSharedQuizFromFirestore = async (sharedQuizId: string): Promise<SharedQuiz | null> => {
  try {
    const docRef = doc(db, SHARED_QUIZZES_COLLECTION, sharedQuizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let createdAt = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAt = data.createdAt.toDate().toISOString();
      }
      return { id: docSnap.id, ...data, createdAt } as SharedQuiz;
    }
    return null;
  } catch (error) {
    console.error("Error fetching shared quiz:", error);
    throw error;
  }
};

export const saveSharedQuizAttemptToFirestore = async (
  sharedQuizId: string,
  userId: string,
  userDisplayName: string,
  score: number,
  numQuestions: number
): Promise<SharedQuizAttempt> => {
  try {
    const attemptRef = doc(db, SHARED_QUIZZES_COLLECTION, sharedQuizId, 'attempts', userId); // Use userId as doc ID for attempt
    const attemptData: SharedQuizAttempt = {
      userId,
      userDisplayName,
      score,
      numQuestions,
      timestamp: new Date().toISOString(),
    };
    await setDoc(attemptRef, attemptData); // Overwrites previous attempt by same user for this shared quiz
    return { id: userId, ...attemptData };
  } catch (error) {
    console.error("Error saving shared quiz attempt:", error);
    throw error;
  }
};

export const getLeaderboardForSharedQuiz = async (sharedQuizId: string): Promise<SharedQuizAttempt[]> => {
  try {
    const attemptsCollectionRef = collection(db, SHARED_QUIZZES_COLLECTION, sharedQuizId, 'attempts');
    // Order by score descending, then by timestamp ascending (earlier submission wins ties)
    const q = query(attemptsCollectionRef, orderBy('score', 'desc'), orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedQuizAttempt));
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};