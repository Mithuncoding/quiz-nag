
import React from 'react';
import { QuizQuestion } from '../types';

interface QuestionCardProps {
  question: QuizQuestion;
  onOptionSelect: (optionKey: string) => void;
  selectedOption?: string;
  showFeedback: boolean;
  questionNumber: number;
  isTimeUp?: boolean; // New prop for timed quizzes
}

const DifficultyChip: React.FC<{ difficulty: QuizQuestion['difficulty'] }> = ({ difficulty }) => {
  let bgColor = 'bg-blue-500/30 text-blue-300';
  let icon = 'fas fa-brain';
  if (difficulty === 'Medium') {
    bgColor = 'bg-yellow-500/30 text-yellow-300';
    icon = 'fas fa-fire';
  } else if (difficulty === 'Hard') {
    bgColor = 'bg-red-500/30 text-red-300';
    icon = 'fas fa-skull-crossbones';
  }
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${bgColor} inline-flex items-center`}>
      <i className={`${icon} mr-1.5`}></i>
      {difficulty}
    </span>
  );
};

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onOptionSelect, selectedOption, showFeedback, questionNumber, isTimeUp }) => {
  const optionKeys = Object.keys(question.options) as Array<keyof typeof question.options>;

  const getOptionClasses = (key: string) => {
    let baseClasses = "w-full text-left p-4 my-2 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500";
    
    if (!showFeedback) {
      return selectedOption === key 
        ? `${baseClasses} bg-slate-600 border-purple-500 shadow-lg` 
        : `${baseClasses} bg-slate-700/50 border-slate-600`;
    }

    // Feedback shown
    const isCorrect = key === question.correctAnswer;
    const isSelected = selectedOption === key;

    if (isCorrect) {
      return `${baseClasses} bg-green-500/30 border-green-500 animate-pulse`; 
    }
    if (isSelected && !isCorrect) {
      return `${baseClasses} bg-red-500/30 border-red-500`; 
    }
    // For unselected options when feedback is shown, or if time is up and this option wasn't selected
    return `${baseClasses} bg-slate-700/50 border-slate-600 opacity-70`; 
  };

  const wasCorrect = selectedOption === question.correctAnswer;

  return (
    <div className="p-1 rounded-lg bg-slate-700/30 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-neutral-100">
           {question.question}
        </h3>
        <DifficultyChip difficulty={question.difficulty} />
      </div>

      {question.imageUrl && (
        <div className="mb-4 max-h-60 overflow-hidden rounded-lg shadow-md flex justify-center">
          <img 
            src={question.imageUrl} 
            alt="Quiz question visual" 
            className="object-contain max-h-60"
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
        </div>
      )}

      <div className="space-y-3">
        {optionKeys.map((key) => (
          <button
            key={key}
            onClick={() => onOptionSelect(key)}
            disabled={showFeedback || isTimeUp} // Disable options if feedback is shown or time is up
            className={getOptionClasses(key)}
            aria-pressed={selectedOption === key}
          >
            <span className="font-semibold mr-2">{key}.</span> {question.options[key as keyof typeof question.options]}
          </button>
        ))}
      </div>

      {showFeedback && (
        <div className={`mt-5 p-4 rounded-lg ${isTimeUp && !selectedOption ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : (wasCorrect ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30')}`}>
          <p className="font-semibold text-lg">
            {isTimeUp && !selectedOption ? (
              <><i className="fas fa-clock mr-2"></i>Time's Up!</>
            ) : wasCorrect ? (
              <><i className="fas fa-check-circle mr-2"></i>Correct!</>
            ) : (
              <><i className="fas fa-times-circle mr-2"></i>Incorrect.</>
            )}
            { !(isTimeUp && !selectedOption) && !wasCorrect && ` The correct answer was ${question.correctAnswer}.`}
          </p>
          <p className="mt-1 text-sm">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
