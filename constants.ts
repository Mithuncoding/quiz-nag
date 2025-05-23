import { Badge, UserProgress, QuizAttempt } from './types';

// IMPORTANT: This Pexels API Key is provided in the prompt. 
// In a real-world scenario, sensitive keys should be handled via environment variables.
export const PEXELS_API_KEY: string = 'OVQukoRCDxTZtcc8jHwvYpMBddDgGl4GYyG70B5cekbQ73uQpXSUW19L';
export const PEXELS_API_URL: string = 'https://api.pexels.com/v1';

export const GEMINI_MODEL_TEXT: string = 'gemini-2.5-flash-preview-04-17';

export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 100; // Updated
export const DEFAULT_QUESTIONS = 5;

// Badge Definitions
export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'first_quiz',
    name: 'First Steps',
    description: 'Completed your first quiz!',
    icon: 'fas fa-shoe-prints',
    criteria: (progress) => progress.totalQuizzesTaken >= 1,
  },
  {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Achieved a perfect score on a quiz.',
    icon: 'fas fa-bullseye',
    criteria: (_progress, quizHistory) => quizHistory.some(attempt => attempt.score === attempt.numQuestions && attempt.numQuestions > 0),
  },
  {
    id: 'topic_explorer',
    name: 'Topic Explorer',
    description: 'Explored 3 different quiz topics.',
    icon: 'fas fa-map-signs',
    criteria: (progress) => progress.completedTopics.size >= 3,
  },
  {
    id: 'quiz_whiz',
    name: 'Quiz Whiz',
    description: 'Answered 25 questions correctly in total.',
    icon: 'fas fa-star',
    criteria: (progress) => progress.totalCorrectAnswers >= 25,
  },
  {
    id: 'speedster',
    name: 'Speedster',
    description: 'Successfully completed a timed quiz.',
    icon: 'fas fa-stopwatch',
    criteria: (progress) => progress.completedTimedQuiz,
  },
  {
    id: 'knowledge_knight',
    name: 'Knowledge Knight',
    description: 'Answered 50 questions correctly in total.',
    icon: 'fas fa-shield-alt',
    criteria: (progress) => progress.totalCorrectAnswers >= 50,
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Completed a quiz 3 days in a row.',
    icon: 'fas fa-fire',
    criteria: (_progress, quizHistory) => {
      if (!quizHistory || quizHistory.length < 3) return false;
      const dates = quizHistory.map(a => new Date(a.timestamp).toDateString());
      const uniqueDates = Array.from(new Set(dates));
      if (uniqueDates.length < 3) return false;
      // Check for 3 consecutive days
      uniqueDates.sort();
      for (let i = 0; i < uniqueDates.length - 2; i++) {
        const d1 = new Date(uniqueDates[i]);
        const d2 = new Date(uniqueDates[i+1]);
        const d3 = new Date(uniqueDates[i+2]);
        if (
          d2.getTime() - d1.getTime() === 86400000 &&
          d3.getTime() - d2.getTime() === 86400000
        ) return true;
      }
      return false;
    },
  },
  {
    id: 'multiplayer_1',
    name: 'Squad Up',
    description: 'Played your first multiplayer game.',
    icon: 'fas fa-users',
    criteria: (_progress, quizHistory) => quizHistory.some(a => a.sharedQuizId),
  },
  {
    id: 'multiplayer_5',
    name: 'Multiplayer Pro',
    description: 'Played 5 multiplayer games.',
    icon: 'fas fa-chess-knight',
    criteria: (_progress, quizHistory) => quizHistory.filter(a => a.sharedQuizId).length >= 5,
  },
  {
    id: 'quiz_sharer',
    name: 'Quiz Sharer',
    description: 'Shared a quiz with a friend.',
    icon: 'fas fa-share-alt',
    criteria: (progress, quizHistory) => quizHistory.some(a => a.sharedQuizId),
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Completed a quiz between midnight and 5am.',
    icon: 'fas fa-moon',
    criteria: (_progress, quizHistory) => quizHistory.some(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour >= 0 && hour < 5;
    }),
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    description: 'Completed a quiz with all questions set to Hard difficulty.',
    icon: 'fas fa-skull-crossbones',
    criteria: (_progress, quizHistory) => quizHistory.some(a => a.quizSnapshot.questions.every(q => q.difficulty === 'Hard')),
  },
  {
    id: 'eli5_fan',
    name: 'ELI5 Fan',
    description: 'Used the "Explain Like I\'m 5" feature.',
    icon: 'fas fa-child',
    criteria: (_progress, quizHistory) => quizHistory.some(a => a.quizSnapshot.questions.some(q => q.simplifiedExplanation)),
  },
];
