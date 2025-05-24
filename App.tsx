import React, { useState, useEffect, useCallback } from 'react';
import { 
    Quiz, QuizConfig, QuizQuestion, QuizAttempt, ViewState, DEFAULT_TIME_PER_QUESTION, 
    UserProgress, DEFAULT_USER_PROGRESS, Badge, SharedQuiz, AppUser, SharedQuizAttempt 
} from './types';
import { generateQuiz as generateQuizFromAPI } from './services/geminiService';
import { getRandomImage as getRandomImageFromAPI } from './services/pexelsService';
import { 
    loadUserProgressFromFirestore, saveUserProgressToFirestore,
    loadQuizHistoryFromFirestore, saveQuizAttemptToHistoryInFirestore,
    saveQuizToFirestore, getQuizFromFirestore,
    createSharedQuizInFirestore, getSharedQuizFromFirestore,
    saveSharedQuizAttemptToFirestore
} from './services/firestoreService';
import { useAuth } from './contexts/AuthContext';

import LandingPage from './components/LandingPage';
import QuizGeneratorForm from './components/QuizGeneratorForm';
import QuizView from './components/QuizView';
import ResultsView from './components/ResultsView';
import HistoryView from './components/HistoryView';
import AchievementsView from './components/AchievementsView';
import LoginView from './components/auth/LoginView';
import SignupView from './components/auth/SignupView';
import LeaderboardView from './components/LeaderboardView';
import Header from './components/Header';
import Footer from './components/Footer';
import Loader from './components/Loader';
import { PEXELS_API_KEY, BADGE_DEFINITIONS, GEMINI_MODEL_TEXT } from './constants';
import MultiplayerLobby from './components/MultiplayerLobby';


const App: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null); // Could be an original Quiz or one fetched for a shared session
  const [currentSharedQuizSession, setCurrentSharedQuizSession] = useState<SharedQuiz | null>(null); // Info about the shared session being taken
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('');
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [activeSharedQuizId, setActiveSharedQuizId] = useState<string | null>(null); // For leaderboard or shared quiz view
  const [proctoringActive, setProctoringActive] = useState<boolean>(false);
  const [autoJoinRoomId, setAutoJoinRoomId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareProctoring, setShareProctoring] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);


  // Initial setup: API keys check, load user data if logged in
  useEffect(() => {
    const geminiApiKey = import.meta.env.VITE_API_KEY;
    let keyStatusMsg = '';
    if (!geminiApiKey) keyStatusMsg += 'Gemini API Key is not configured. AI features may be unavailable.';
    if (!PEXELS_API_KEY) keyStatusMsg += (keyStatusMsg ? ' ' : '') + 'Pexels API Key missing. Image questions may not work.';
    setApiKeyStatus(keyStatusMsg);
    if (keyStatusMsg && !keyStatusMsg.includes('Pexels') && !keyStatusMsg.includes('Gemini API Key is not configured')) setError(keyStatusMsg);

    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('shareId');
    const roomId = urlParams.get('room');
    if (roomId) {
      setAutoJoinRoomId(roomId);
      setCurrentView('multiplayer');
      return;
    }
    if (shareId) {
        handleJoinSharedQuiz(shareId);
    } else if (!currentUser && !authLoading) {
        setCurrentView('landing');
    }

  }, [authLoading]); // Rerun if auth state changes, for example, to load data post-login

  // Load user-specific data (history, progress) when user logs in or on initial load if already logged in
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const [progress, history] = await Promise.all([
            loadUserProgressFromFirestore(currentUser.uid),
            loadQuizHistoryFromFirestore(currentUser.uid)
          ]);
          setUserProgress(progress);
          setQuizHistory(history);
        } catch (err) {
          console.error("Failed to load user data:", err);
          setError("Could not load your data. Please try again later.");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Reset user-specific data if logged out
        setUserProgress(DEFAULT_USER_PROGRESS);
        setQuizHistory([]);
      }
    };
    if (!authLoading) { // Only load data once auth status is resolved
        loadData();
    }
  }, [currentUser, authLoading]);

  const updateUserProgressAndSave = useCallback(async (newProgressUpdates: Partial<UserProgress>) => {
    if (!currentUser) return;
    
    setUserProgress(prev => {
      const updated: UserProgress = {
        ...prev,
        ...newProgressUpdates,
        completedTopics: newProgressUpdates.completedTopics 
                           ? new Set([...Array.from(prev.completedTopics), ...Array.from(newProgressUpdates.completedTopics)]) 
                           : prev.completedTopics,
        awardedBadgeIds: newProgressUpdates.awardedBadgeIds || prev.awardedBadgeIds,
      };
      
      // Save to Firestore (async, no need to await here for UI responsiveness)
      saveUserProgressToFirestore(currentUser.uid, updated)
        .catch(err => console.error("Failed to save progress to Firestore:", err));
      return updated;
    });
  }, [currentUser]);

  const awardBadges = useCallback((currentProgress: UserProgress, history: QuizAttempt[]) => {
    if (!currentUser) return; // Badges are user-specific
    const newlyAwardedBadgeIds = new Set<string>(currentProgress.awardedBadgeIds);
    let madeChange = false;

    BADGE_DEFINITIONS.forEach(badge => {
      if (!newlyAwardedBadgeIds.has(badge.id) && badge.criteria(currentProgress, history)) {
        newlyAwardedBadgeIds.add(badge.id);
        madeChange = true;
        console.log(`New badge awarded: ${badge.name}`); // TODO: Show toast notification
      }
    });

    if (madeChange) {
      updateUserProgressAndSave({ awardedBadgeIds: Array.from(newlyAwardedBadgeIds) });
    }
  }, [currentUser, updateUserProgressAndSave]);

  useEffect(() => {
    if (currentUser && (userProgress !== DEFAULT_USER_PROGRESS || quizHistory.length > 0)) {
        awardBadges(userProgress, quizHistory);
    }
  }, [userProgress, quizHistory, awardBadges, currentUser]);


  const handleGenerateQuiz = useCallback(async (config: QuizConfig) => {
    if (!import.meta.env.VITE_API_KEY) {
        setError("Gemini API Key is not set. Cannot generate quiz.");
        setCurrentView('form');
        return;
    }
    setIsLoading(true); setError(null); setQuizConfig(config); setCurrentView('loading');
    setCurrentSharedQuizSession(null);
    try {
      let imageUrl: string | undefined;
      if (PEXELS_API_KEY) {
         try { imageUrl = await getRandomImageFromAPI(); } 
         catch (e) { console.warn("Pexels image fetch failed:", e); }
      }
      const quizDataFromAPI = await generateQuizFromAPI(config.topicOrText, config.numQuestions, imageUrl, config.bloomLevel);
      const generatedQuiz: Quiz = {
        ...quizDataFromAPI,
        isTimed: config.isTimed,
        timePerQuestion: config.isTimed ? DEFAULT_TIME_PER_QUESTION : undefined,
        questions: quizDataFromAPI.questions.map(q => ({...q, simplifiedExplanation: undefined})),
      };
      if (config.isPublic && currentUser) {
        const savedOriginalQuiz = await saveQuizToFirestore(generatedQuiz, currentUser.uid);
        generatedQuiz.id = savedOriginalQuiz.id;
        const sharedSession = await createSharedQuizInFirestore(
            savedOriginalQuiz.id!, 
            currentUser.uid, 
            currentUser.displayName || currentUser.email,
            savedOriginalQuiz,
            !!config.enableProctoring
        );
        const shareableLink = `${window.location.origin}${window.location.pathname}?shareId=${sharedSession.id}`;
        setShareLink(shareableLink);
        setShareProctoring(!!config.enableProctoring);
        setShareModalOpen(true);
        setCurrentView('form');
        return;
      }
      setCurrentQuiz(generatedQuiz);
      setUserAnswers({});
      setScore(0);
      setCurrentView('quiz');
      if (config.enableProctoring) {
           setProctoringActive(true);
      } else {
           setProctoringActive(false);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate quiz.';
      setError(errorMsg + (config.isPublic ? " Sharing process might have also been affected." : ""));
      setCurrentView('form');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const handleSubmitQuiz = useCallback(async (answers: Record<number, string>) => {
    if (!currentQuiz) return;

    let calculatedScore = 0;
    currentQuiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) calculatedScore++;
    });
    
    setScore(calculatedScore);
    setUserAnswers(answers);

    // If this was a shared quiz, save attempt to sharedQuiz session
    if (currentSharedQuizSession && currentUser) {
      try {
        await saveSharedQuizAttemptToFirestore(
          currentSharedQuizSession.id,
          currentUser.uid,
          currentUser.displayName || currentUser.email || "Anonymous",
          calculatedScore,
          currentQuiz.questions.length
        );
      } catch (e) {
        console.error("Failed to save shared quiz attempt:", e);
        // Non-fatal, user can still see results
      }
    } 
    // Always save to personal history if logged in
    else if (currentUser && currentQuiz.id) { // currentQuiz.id implies it was saved (e.g. a personal quiz)
        const attempt: Omit<QuizAttempt, 'id'|'timestamp'> = {
            quizId: currentQuiz.id!,
            sharedQuizId: currentSharedQuizSession?.id,
            userId: currentUser.uid,
            quizSnapshot: currentQuiz, 
            userAnswers: answers,
            score: calculatedScore,
            topic: currentQuiz.topic,
            numQuestions: currentQuiz.questions.length,
            correctAnswersCount: calculatedScore,
            isTimedQuiz: !!currentQuiz.isTimed,
        };
        const savedAttempt = await saveQuizAttemptToHistoryInFirestore(currentUser.uid, attempt);
        setQuizHistory(prev => [savedAttempt, ...prev].slice(0, 20)); // Optimistic update
        
        updateUserProgressAndSave({
            totalQuizzesTaken: (userProgress.totalQuizzesTaken || 0) + 1,
            totalCorrectAnswers: (userProgress.totalCorrectAnswers || 0) + calculatedScore,
            completedTopics: new Set([...Array.from(userProgress.completedTopics), currentQuiz.topic]),
            completedTimedQuiz: userProgress.completedTimedQuiz || !!currentQuiz.isTimed,
        });
    }
    // If not logged in or not a savable quiz (e.g. not shared, not a personal quiz from DB), it's ephemeral

    setCurrentView('results');
  }, [currentUser, currentQuiz, currentSharedQuizSession, userProgress.totalQuizzesTaken, userProgress.totalCorrectAnswers, userProgress.completedTopics, userProgress.completedTimedQuiz, updateUserProgressAndSave]);

  const handleNavigate = (view: ViewState, associatedId: string | null = null) => {
    setError(null); 
    setProctoringActive(false); // Reset proctoring banner
    if (view === 'form' || view === 'landing') {
        setCurrentQuiz(null); 
        setUserAnswers({});
        setCurrentSharedQuizSession(null);
        // Clear shareId from URL if navigating away from a shared context manually
        if (window.history.pushState) {
            const newUrl = window.location.pathname;
            window.history.pushState({path:newUrl}, '', newUrl);
        }
    }
    if (view === 'leaderboard' && associatedId) {
        setActiveSharedQuizId(associatedId);
    } else {
        setActiveSharedQuizId(null);
    }
    setCurrentView(view);
  };
  
  const handleReviewQuiz = (attempt: QuizAttempt) => {
    const quizWithEli5 = {
        ...attempt.quizSnapshot,
        questions: attempt.quizSnapshot.questions.map(q => ({...q, simplifiedExplanation: q.simplifiedExplanation || undefined}))
    };
    setCurrentQuiz(quizWithEli5); 
    setUserAnswers(attempt.userAnswers);
    setScore(attempt.score);
    setCurrentSharedQuizSession(null); // Reviewing from personal history, not a live shared session
    // If attempt has a sharedQuizId, we could potentially link to its leaderboard
    if (attempt.sharedQuizId) {
      // Option to show "View original shared quiz leaderboard"
      // setActiveSharedQuizId(attempt.sharedQuizId); 
    }
    setCurrentView('results'); 
  };

  const handleUpdateQuizQuestion = useCallback((questionIndex: number, updatedQuestionData: Partial<QuizQuestion>) => {
    setCurrentQuiz(prevQuiz => {
        if (!prevQuiz) return null;
        const updatedQuestions = prevQuiz.questions.map((q, idx) => 
            idx === questionIndex ? { ...q, ...updatedQuestionData } : q
        );
        return { ...prevQuiz, questions: updatedQuestions };
    });
  }, []);

  const handleJoinSharedQuiz = async (sharedQuizId: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const sharedSession = await getSharedQuizFromFirestore(sharedQuizId);
        if (!sharedSession) {
            throw new Error("Shared quiz session not found. The link may be invalid or expired.");
        }
        const originalQuiz = await getQuizFromFirestore(sharedSession.quizId);
        if (!originalQuiz) {
            throw new Error("The original quiz for this shared session could not be loaded.");
        }
        
        setCurrentSharedQuizSession(sharedSession);
        setCurrentQuiz({ // Prepare quiz for taking
            ...originalQuiz,
            isTimed: sharedSession.isTimed,
            timePerQuestion: sharedSession.isTimed ? (sharedSession.timePerQuestion || DEFAULT_TIME_PER_QUESTION) : undefined,
            questions: originalQuiz.questions.map(q => ({...q, simplifiedExplanation: undefined})), // Reset ELI5
        });
        setUserAnswers({});
        setScore(0);
        if (sharedSession.proctored) {
            setProctoringActive(true);
            // Camera permission is implicitly requested by <QuizView> if proctoringActive is true
        } else {
            setProctoringActive(false);
        }
        setCurrentView('quiz');
         // Update URL to reflect joining this shared quiz
        if (window.history.pushState) {
            const newUrl = `${window.location.pathname}?shareId=${sharedQuizId}`;
            window.history.pushState({path:newUrl}, '', newUrl);
        }

    } catch (err) {
        console.error("Error joining shared quiz:", err);
        setError(err instanceof Error ? err.message : "Could not load the shared quiz.");
        setCurrentView('landing'); // Or 'form'
    } finally {
        setIsLoading(false);
    }
  };

  const handleLandingJoinSharedQuiz = async (code: string) => {
    setLandingError(null);
    setIsLoading(true);
    try {
      await handleJoinSharedQuiz(code);
    } catch (err) {
      setLandingError(err instanceof Error ? err.message : 'Could not join shared quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandingJoinMultiplayer = (code: string) => {
    setLandingError(null);
    setAutoJoinRoomId(code);
    setCurrentView('multiplayer');
  };

  const handleStartMultiplayerQuiz = () => {
    // TODO: Implement multiplayer quiz start logic if needed
  };

  const renderView = () => {
    if (authLoading || (isLoading && currentView !== 'quiz')) { // QuizView has its own internal loading/timer
      return <Loader message={isLoading ? "Processing..." : "Initializing..."} />;
    }
    if (error && currentView !== 'form' && currentView !=='login' && currentView !=='signup') { // Form and auth views handle their own errors
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-red-400">An Error Occurred</h2>
                <p className="text-neutral-300 my-4">{error}</p>
                <button onClick={() => { setError(null); handleNavigate('landing');}} className="bg-purple-600 p-2 rounded">Go Home</button>
            </div>
        );
    }


    switch (currentView) {
      case 'landing':
        return <LandingPage 
          onStartQuiz={() => currentUser ? handleNavigate('form') : handleNavigate('login')}
          onJoinSharedQuiz={handleLandingJoinSharedQuiz}
          onJoinMultiplayerRoom={handleLandingJoinMultiplayer}
        />;
      case 'login':
        return <LoginView onLoginSuccess={() => handleNavigate('form')} onNavigateToSignup={() => handleNavigate('signup')} />;
      case 'signup':
        return <SignupView onSignupSuccess={() => handleNavigate('form')} onNavigateToLogin={() => handleNavigate('login')} />;
      case 'form':
        return <QuizGeneratorForm 
                    onGenerateQuiz={handleGenerateQuiz} 
                    initialError={error} 
                    apiKeyStatus={apiKeyStatus}
                    navigateToSharedQuiz={(id) => handleJoinSharedQuiz(id)}
                    shareModalOpen={shareModalOpen}
                    setShareModalOpen={setShareModalOpen}
                    shareLink={shareLink}
                    shareProctoring={shareProctoring}
                />;
      case 'quiz':
        return currentQuiz ? <QuizView quiz={currentQuiz} onSubmit={handleSubmitQuiz} proctoringActive={proctoringActive && currentSharedQuizSession?.proctored} /> : <Loader message="Loading quiz..."/>;
      case 'results':
        return currentQuiz ? (
            <ResultsView 
                quiz={currentQuiz} 
                userAnswers={userAnswers} 
                score={score} 
                onTryAgain={() => handleNavigate('form')} 
                onViewHistory={currentUser ? () => handleNavigate('history') : undefined} 
                apiKeyStatus={apiKeyStatus} 
                onUpdateQuizQuestion={handleUpdateQuizQuestion}
                sharedQuizSession={currentSharedQuizSession}
                onViewLeaderboard={currentSharedQuizSession ? (id) => handleNavigate('leaderboard', id) : undefined}
            />
        ) : <Loader message="Loading results..."/>;
      case 'history':
        if (!currentUser) { handleNavigate('login'); return <Loader message="Redirecting to login..."/>; }
        return <HistoryView history={quizHistory} onReviewQuiz={handleReviewQuiz} onGoToForm={() => handleNavigate('form')} />;
      case 'achievements':
        if (!currentUser) { handleNavigate('login'); return <Loader message="Redirecting to login..."/>; }
        return <AchievementsView userProgress={userProgress} allBadges={BADGE_DEFINITIONS} onGoToForm={() => handleNavigate('form')} />;
      case 'leaderboard':
        // activeSharedQuizId should be set before navigating here
        return activeSharedQuizId ? 
               <LeaderboardView sharedQuizIdFromProp={activeSharedQuizId} onGoToForm={() => handleNavigate('form')} /> :
               <div className="text-center p-5 text-red-400">Error: No Quiz ID specified for leaderboard. <button onClick={()=>handleNavigate('form')}>Go to Form</button></div>;
      case 'multiplayer':
        return <MultiplayerLobby onStartQuiz={handleStartMultiplayerQuiz} autoJoinRoomId={autoJoinRoomId} />;
      default:
        return <LandingPage onStartQuiz={() => currentUser ? handleNavigate('form') : handleNavigate('login')} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        onNavigateHome={() => handleNavigate('landing')} 
        onNavigateNewQuiz={() => currentUser ? handleNavigate('form') : handleNavigate('login')} 
        onNavigateHistory={() => currentUser ? handleNavigate('history') : handleNavigate('login')}
        onNavigateAchievements={() => currentUser ? handleNavigate('achievements') : handleNavigate('login')}
        onNavigateLogin={() => handleNavigate('login')}
        onNavigateSignup={() => handleNavigate('signup')}
        onNavigateMultiplayer={(mode) => handleNavigate('multiplayer')}
        onJoinSharedQuiz={handleLandingJoinSharedQuiz}
        onJoinMultiplayerRoom={handleLandingJoinMultiplayer}
      />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col mt-28 md:mt-32 transition-all duration-300">
        <div className="w-full view-transition">
          {renderView()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
