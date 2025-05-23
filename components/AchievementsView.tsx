
import React from 'react';
import { UserProgress, Badge as BadgeType } from '../types';

interface AchievementsViewProps {
  userProgress: UserProgress;
  allBadges: BadgeType[];
  onGoToForm: () => void;
}

const AchievementsView: React.FC<AchievementsViewProps> = ({ userProgress, allBadges, onGoToForm }) => {
  const awardedBadges = allBadges.filter(badge => userProgress.awardedBadgeIds.includes(badge.id));
  const notYetAwardedBadges = allBadges.filter(badge => !userProgress.awardedBadgeIds.includes(badge.id));

  const progressStats = [
    { label: 'Quizzes Taken', value: userProgress.totalQuizzesTaken, icon: 'fas fa-list-alt' },
    { label: 'Correct Answers', value: userProgress.totalCorrectAnswers, icon: 'fas fa-check-circle' },
    { label: 'Unique Topics Explored', value: userProgress.completedTopics.size, icon: 'fas fa-atlas' },
    { label: 'Timed Quiz Completed', value: userProgress.completedTimedQuiz ? 'Yes' : 'No', icon: 'fas fa-stopwatch-20' },
  ];

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 transform hover:scale-[1.01] transition-transform duration-300">
      <h2 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
        <i className="fas fa-trophy mr-3 text-yellow-400"></i>My Achievements
      </h2>

      {/* Progress Stats Section */}
      <div className="mb-10">
        <h3 className="text-2xl font-semibold text-neutral-200 mb-4">Your Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {progressStats.map(stat => (
            <div key={stat.label} className="bg-slate-700/50 p-4 rounded-lg shadow-md flex items-center">
              <i className={`${stat.icon} text-3xl text-purple-400 mr-4`}></i>
              <div>
                <p className="text-2xl font-bold text-neutral-100">{stat.value}</p>
                <p className="text-sm text-neutral-300">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Awarded Badges Section */}
      {awardedBadges.length > 0 ? (
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-neutral-200 mb-4">Earned Badges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {awardedBadges.map((badge) => (
              <div key={badge.id} className="bg-slate-700/50 p-5 rounded-lg shadow-lg text-center transform transition-all hover:shadow-purple-500/30 hover:-translate-y-1">
                <i className={`${badge.icon} text-5xl mb-3 ${badge.id === 'perfect_score' ? 'text-yellow-400' : 'text-green-400'}`}></i>
                <h4 className="text-xl font-semibold text-neutral-100 mb-1">{badge.name}</h4>
                <p className="text-sm text-neutral-300">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-6 bg-slate-700/30 rounded-lg mb-10">
          <i className="fas fa-award text-5xl text-slate-500 mb-3"></i>
          <p className="text-neutral-300 text-lg">No badges earned yet. Keep taking quizzes to unlock achievements!</p>
        </div>
      )}

      {/* Not Yet Awarded Badges Section (Optional - for motivation) */}
      {notYetAwardedBadges.length > 0 && (
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-neutral-200 mb-4">Badges to Unlock</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {notYetAwardedBadges.map((badge) => (
              <div key={badge.id} className="bg-slate-700/30 p-5 rounded-lg shadow-md text-center opacity-60">
                <i className={`${badge.icon} text-5xl text-slate-500 mb-3`}></i>
                <h4 className="text-xl font-semibold text-neutral-400 mb-1">{badge.name}</h4>
                <p className="text-sm text-neutral-500">{badge.description}</p>
                 {/* Could add a hint on how to get it:
                 <p className="text-xs text-purple-400 mt-1">Hint: Try completing a timed quiz!</p> 
                 */}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={onGoToForm}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          <i className="fas fa-plus-circle mr-2"></i> Take Another Quiz
        </button>
      </div>
    </div>
  );
};

export default AchievementsView;
