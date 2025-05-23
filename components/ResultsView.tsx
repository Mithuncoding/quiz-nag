import React, { useState, useCallback } from 'react';
import { Quiz, QuizQuestion, SharedQuiz } from '../types';
import AITutorView from './AITutorView';
import { getSimplifiedExplanation } from '../services/geminiService'; 
import Loader from './Loader'; 

interface ResultsViewProps {
  quiz: Quiz; // This could be the original Quiz or quizSnapshot from QuizAttempt
  userAnswers: Record<number, string>;
  score: number;
  onTryAgain: () => void;
  onViewHistory: () => void;
  apiKeyStatus: string;
  onUpdateQuizQuestion: (questionIndex: number, updatedQuestion: Partial<QuizQuestion>) => void;
  sharedQuizSession?: SharedQuiz | null; // If this result is from a shared quiz
  onViewLeaderboard?: (sharedQuizId: string) => void; // Function to navigate to leaderboard
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
  quiz, userAnswers, score, onTryAgain, onViewHistory, 
  apiKeyStatus, onUpdateQuizQuestion, sharedQuizSession, onViewLeaderboard 
}) => {
  const totalQuestions = quiz.questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const [showTutor, setShowTutor] = useState(false);
  const [simplifyingQuestionIndex, setSimplifyingQuestionIndex] = useState<number | null>(null);
  const [eli5Error, setEli5Error] = useState<string | null>(null);

  let feedbackMessage = "Good effort! Keep practicing.";
  if (percentage === 100) feedbackMessage = "Perfect score! You're a Quiz Master! 🎉";
  else if (percentage >= 80) feedbackMessage = "Excellent work! You know your stuff!";
  else if (percentage >= 60) feedbackMessage = "Well done! Solid performance.";

  const toggleTutor = () => setShowTutor(!showTutor);

  const handleSimplifyExplanation = useCallback(async (questionIndex: number) => {
    if (!process.env.API_KEY) {
        setEli5Error("Gemini API Key is not configured. Cannot simplify explanation.");
        return;
    }
    const question = quiz.questions[questionIndex];
    if (!question || question.simplifiedExplanation) return; 

    setSimplifyingQuestionIndex(questionIndex);
    setEli5Error(null);
    try {
      const simplified = await getSimplifiedExplanation(question.explanation);
      onUpdateQuizQuestion(questionIndex, { simplifiedExplanation: simplified });
    } catch (err) {
      console.error("ELI5 Error:", err);
      setEli5Error(err instanceof Error ? err.message : "Failed to simplify explanation.");
    } finally {
      setSimplifyingQuestionIndex(null);
    }
  }, [quiz.questions, onUpdateQuizQuestion]);

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 text-center">
      <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Quiz Results</h2>
      {sharedQuizSession && <p className="text-md text-purple-300 mb-1">For Shared Quiz: "{sharedQuizSession.topic}" by {sharedQuizSession.creatorDisplayName || 'Anonymous'}</p>}
      <p className="text-2xl text-neutral-200 mb-2">
        You scored <span className="font-bold text-green-400">{score}</span> out of <span className="font-bold text-yellow-400">{totalQuestions}</span> ({percentage}%)
      </p>
      <p className="text-lg text-neutral-300 mb-6">{feedbackMessage}</p>

      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
        <button
          onClick={onTryAgain}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          <i className="fas fa-redo-alt mr-2"></i> Create/Try New Quiz
        </button>
        {onViewHistory && (
            <button
            onClick={onViewHistory}
            className="bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
            <i className="fas fa-history mr-2"></i> View My History
            </button>
        )}
        {sharedQuizSession && onViewLeaderboard && (
           <button
            onClick={() => onViewLeaderboard(sharedQuizSession.id)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
            <i className="fas fa-trophy mr-2"></i> View Leaderboard
            </button>
        )}
      </div>
      
      {eli5Error && (
        <div className="my-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm" role="alert">
            <i className="fas fa-exclamation-triangle mr-2"></i>ELI5 Error: {eli5Error}
        </div>
      )}

      <div className="my-8 border-t border-slate-700 pt-6">
        <button
          onClick={toggleTutor}
          disabled={!!(apiKeyStatus && !apiKeyStatus.includes("Pexels"))}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-expanded={showTutor} aria-controls="ai-tutor-section"
        >
          <i className={`fas ${showTutor ? 'fa-comment-slash' : 'fa-user-graduate'} mr-2`}></i> 
          {showTutor ? 'Close AI Tutor' : `Chat with AI Tutor about "${quiz.topic}"`}
        </button>
        {apiKeyStatus && !apiKeyStatus.includes("Pexels") && (
             <p className="text-sm text-yellow-400 mt-2">AI Tutor requires a valid Gemini API Key.</p>
        )}
        {showTutor && !(apiKeyStatus && !apiKeyStatus.includes("Pexels")) && (
          <div id="ai-tutor-section" className="mt-6">
            <AITutorView topic={quiz.topic} apiKeyStatus={apiKeyStatus} />
          </div>
        )}
      </div>

      <div className="mt-8 text-left space-y-6 max-h-[60vh] overflow-y-auto p-4 bg-slate-700/30 rounded-lg custom-scrollbar">
        <h3 className="text-2xl font-semibold text-neutral-100 mb-4 sticky top-0 bg-slate-700/80 backdrop-blur-sm py-2 px-1 z-10 rounded">Review Answers:</h3>
        {quiz.questions.map((q, index) => (
          <div key={index} className={`p-4 rounded-lg border ${userAnswers[index] === q.correctAnswer ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
            <p className="font-semibold text-lg text-neutral-200 mb-1">{index + 1}. {q.question}</p>
            {q.imageUrl && <img src={q.imageUrl} alt="Question context" className="my-2 rounded max-h-40 object-contain"/>}
            <p className="text-sm text-neutral-300">Your answer: <span className={`font-medium ${userAnswers[index] === q.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>{q.options[userAnswers[index] as keyof typeof q.options] || 'Not answered'}</span></p>
            {userAnswers[index] !== q.correctAnswer && (
              <p className="text-sm text-green-400">Correct answer: {q.options[q.correctAnswer as keyof typeof q.options]}</p>
            )}
            
            <div className="mt-2 text-xs text-neutral-400">
                <p className="font-semibold text-neutral-300">Explanation:</p>
                {q.simplifiedExplanation ? (
                    <>
                        <p className="italic text-purple-300">(Simplified)</p>
                        <p>{q.simplifiedExplanation}</p>
                         <button 
                            onClick={() => onUpdateQuizQuestion(index, { simplifiedExplanation: undefined })}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                            aria-label="Show original explanation"
                        >
                            Show Original
                        </button>
                    </>
                ) : (
                    <p>{q.explanation}</p>
                )}
            </div>

            {simplifyingQuestionIndex === index ? (
                <div className="mt-2 flex items-center text-sm text-purple-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i> Simplifying...
                </div>
            ) : (
                 !q.simplifiedExplanation && process.env.API_KEY && (
                    <button
                        onClick={() => handleSimplifyExplanation(index)}
                        disabled={simplifyingQuestionIndex !== null}
                        className="mt-2 text-xs bg-purple-600/50 hover:bg-purple-500/50 text-purple-300 font-medium py-1 px-2 rounded-md transition-colors duration-200 disabled:opacity-50"
                        aria-label="Simplify explanation"
                    >
                        <i className="fas fa-child mr-1"></i> Explain Simpler
                    </button>
                )
            )}
             {!process.env.API_KEY && !q.simplifiedExplanation && (
                <p className="text-xs text-yellow-500 mt-1">ELI5 needs API Key.</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">Difficulty: {q.difficulty}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsView;
