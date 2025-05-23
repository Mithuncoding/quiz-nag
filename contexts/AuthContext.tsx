import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { AppUser, DEFAULT_USER_PROGRESS, UserProgress } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { saveUserProgressToFirestore } from '../services/firestoreService'; // To init progress for new user

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  signup: (email: string, pass: string, displayName?: string) => Promise<AppUser>;
  login: (email: string, pass: string) => Promise<AppUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        // Check if user progress exists, if not, create it
        const userProgressRef = doc(db, `userProgress/${user.uid}`);
        const userProgressSnap = await getDoc(userProgressRef);
        if (!userProgressSnap.exists()) {
          const initialProgress: UserProgress = {
            ...DEFAULT_USER_PROGRESS,
            userId: user.uid,
            // awardedBadgeIds will be an array here for Firestore
            awardedBadgeIds: [], 
            // completedTopics will be an array here for Firestore, convert back to Set on load
            completedTopics: new Set()
          };
          // Explicitly convert Set to array for Firestore
          await saveUserProgressToFirestore(user.uid, { ...initialProgress, completedTopics: [] as any });
        }
      }
    });
    return unsubscribe;
  }, []);

  const signup = async (email: string, pass: string, displayName?: string): Promise<AppUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user && displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    // Initialize user progress document
    const initialProgress: UserProgress = { 
        ...DEFAULT_USER_PROGRESS, 
        userId: userCredential.user.uid, 
        awardedBadgeIds: [], 
        completedTopics: new Set() 
    };
     // Explicitly convert Set to array for Firestore
    await saveUserProgressToFirestore(userCredential.user.uid, {...initialProgress, completedTopics: [] as any});
    return userCredential.user;
  };

  const login = async (email: string, pass: string): Promise<AppUser> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  };

  const logout = (): Promise<void> => {
    return firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
