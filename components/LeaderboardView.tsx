
import React, { useState, useEffect } from 'react';
// Removed: import { useParams, useLocation } from 'react-router-dom'; 
import { LeaderboardEntry, SharedQuiz } from '../types';
import { getLeaderboardForSharedQuiz, getSharedQuizFromFirestore } from '../services/firestoreService';
import Loader from './Loader';

interface LeaderboardViewProps {
  sharedQuizIdFromProp?: string; // If passed directly
  onGoToForm: () => void;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ sharedQuizIdFromProp, onGoToForm }) => {
  const sharedQuizId = sharedQuizIdFromProp; // Simplified: Rely only on the prop

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sharedQuizInfo, setSharedQuizInfo] = useState<SharedQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sharedQuizId) {
      setError("No shared quiz ID provided to display leaderboard.");
      setIsLoading(false);
      return;
    }

    const fetchLeaderboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [entries, quizInfo] = await Promise.all([
          getLeaderboardForSharedQuiz(sharedQuizId),
          getSharedQuizFromFirestore(sharedQuizId)
        ]);
        setLeaderboard(entries);
        setSharedQuizInfo(quizInfo);
        if (!quizInfo) {
            setError(`Shared quiz session with ID ${sharedQuizId} not found.`);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load leaderboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [sharedQuizId]);

  if (isLoading) {
    return <Loader message="Fetching leaderboard..." />;
  }

  if (error) {
    return (
      <div className="text-center p-10 bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl">
        <i className="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
        <h2 className="text-3xl font-bold mb-4 text-neutral-200">Error</h2>
        <p className="text-neutral-300 mb-6">{error}</p>
        <button
          onClick={onGoToForm}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg"
        >
          Create New Quiz
        </button>
      </div>
    );
  }
  
  if (!sharedQuizInfo) {
     return (
      <div className="text-center p-10 bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl">
        <i className="fas fa-question-circle text-6xl text-yellow-400 mb-4"></i>
        <h2 className="text-3xl font-bold mb-4 text-neutral-200">Leaderboard Not Found</h2>
        <p className="text-neutral-300 mb-6">The requested leaderboard could not be found. The link might be invalid or the session expired.</p>
         <button onClick={onGoToForm} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg">Create New Quiz</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10">
      <h2 className="text-4xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
        <i className="fas fa-trophy mr-3"></i>Leaderboard
      </h2>
      <p className="text-center text-xl text-purple-300 mb-1">Quiz: "{sharedQuizInfo.topic}"</p>
      <p className="text-center text-sm text-neutral-400 mb-6">Shared by: {sharedQuizInfo.creatorDisplayName || 'Anonymous'} on {new Date(sharedQuizInfo.createdAt).toLocaleDateString()}</p>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-users text-5xl text-slate-500 mb-3"></i>
          <p className="text-neutral-300 text-lg">No attempts recorded for this quiz yet. Be the first!</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Participant</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Percentage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800/30 divide-y divide-slate-700/50">
              {leaderboard.map((entry, index) => (
                <tr key={entry.id || entry.userId} className={`hover:bg-slate-700/40 ${index === 0 ? 'bg-yellow-500/10' : index === 1 ? 'bg-gray-400/10' : index === 2 ? 'bg-orange-600/10' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-100">
                    {index + 1}
                    {index === 0 && <i className="fas fa-crown ml-2 text-yellow-400"></i>}
                    {index === 1 && <i className="fas fa-medal ml-2 text-gray-300"></i>}
                    {index === 2 && <i className="fas fa-award ml-2 text-orange-400"></i>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">{entry.userDisplayName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">{entry.score} / {entry.numQuestions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">{((entry.score / entry.numQuestions) * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{new Date(entry.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-8 text-center">
        <button
            onClick={onGoToForm}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg"
        >
            <i className="fas fa-plus-circle mr-2"></i> Create or Try Another Quiz
        </button>
      </div>
    </div>
  );
};

export default LeaderboardView;
