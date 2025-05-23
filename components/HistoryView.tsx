
import React from 'react';
import { QuizAttempt } from '../types';

interface HistoryViewProps {
  history: QuizAttempt[];
  onReviewQuiz: (attempt: QuizAttempt) => void;
  onGoToForm: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onReviewQuiz, onGoToForm }) => {
  if (history.length === 0) {
    return (
      <div className="text-center p-10 bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl">
        <i className="fas fa-ghost text-6xl text-purple-400 mb-4"></i>
        <h2 className="text-3xl font-bold mb-4 text-neutral-200">No Quiz History Yet!</h2>
        <p className="text-neutral-300 mb-6">Looks like you haven't taken any quizzes. Create one now!</p>
        <button
          onClick={onGoToForm}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          <i className="fas fa-plus-circle mr-2"></i> Create New Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10">
      <h2 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Quiz History</h2>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
        {history.slice().reverse().map((attempt) => ( // Show newest first
          <div key={attempt.id} className="bg-slate-700/50 p-6 rounded-lg shadow-lg hover:shadow-purple-500/30 transition-shadow duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h3 className="text-xl font-semibold text-purple-300 mb-1">{attempt.topic || "Custom Quiz"}</h3>
              <p className="text-sm text-neutral-400">
                Date: {new Date(attempt.timestamp).toLocaleDateString()} - Time: {new Date(attempt.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-sm text-neutral-300">
                Score: <span className="font-bold text-green-400">{attempt.score}</span> / {attempt.numQuestions}
                 ({attempt.numQuestions > 0 ? Math.round((attempt.score / attempt.numQuestions) * 100) : 0}%)
              </p>
            </div>
            <button
              onClick={() => onReviewQuiz(attempt)}
              className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
            >
              <i className="fas fa-eye mr-2"></i> Review
            </button>
          </div>
        ))}
      </div>
       <div className="mt-8 text-center">
        <button
          onClick={onGoToForm}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          <i className="fas fa-plus-circle mr-2"></i> Create Another Quiz
        </button>
      </div>
    </div>
  );
};

export default HistoryView;
