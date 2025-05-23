import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Quiz, QuizQuestion, DEFAULT_TIME_PER_QUESTION } from '../types';
import QuestionCard from './QuestionCard';

interface QuizViewProps {
  quiz: Quiz;
  onSubmit: (answers: Record<number, string>) => void;
  proctoringActive?: boolean;
}

const TimerDisplay: React.FC<{ timeLeft: number; totalTime: number }> = ({ timeLeft, totalTime }) => {
  const strokeWidth = 8;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / totalTime) * circumference;
  let ringColor = "text-green-400";
  if (timeLeft <= totalTime * 0.25) ringColor = "text-red-500";
  else if (timeLeft <= totalTime * 0.5) ringColor = "text-yellow-400";

  return (
    <div className="relative w-20 h-20 mx-auto mb-1">
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 76 76">
        <circle className="text-slate-700" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx="38" cy="38" />
        <circle className={`${ringColor} transition-all duration-300`} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="38" cy="38" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-neutral-200">{timeLeft}</span>
    </div>
  );
};

const QuizView: React.FC<QuizViewProps> = ({ quiz, onSubmit, proctoringActive }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const timePerQuestion = quiz.timePerQuestion || DEFAULT_TIME_PER_QUESTION;
  const [timeLeft, setTimeLeft] = useState<number>(timePerQuestion);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  useEffect(() => {
    if (proctoringActive) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera access denied or error:", err);
          setCameraError("Camera access is required for proctored mode but was denied or failed. You can still take the quiz.");
        });
    }
    // Cleanup camera stream on component unmount or if proctoring becomes inactive
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [proctoringActive]); // Only re-run if proctoringActive changes

  const moveToNextQuestionOrSubmit = useCallback(() => {
    setShowFeedback(false);
    setTimeLeft(timePerQuestion); 
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onSubmit(selectedAnswers);
    }
  }, [currentQuestionIndex, quiz.questions.length, onSubmit, selectedAnswers, timePerQuestion]);

  useEffect(() => {
    if (!quiz.isTimed || showFeedback) return; 
    if (timeLeft <= 0) {
      setShowFeedback(true); 
      if(selectedAnswers[currentQuestionIndex] === undefined) {
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: "" })); 
      }
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prevTime => prevTime - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, quiz.isTimed, showFeedback, currentQuestionIndex, selectedAnswers]); // Removed moveToNextQuestionOrSubmit

  const handleOptionSelect = (optionKey: string) => {
    if (showFeedback) return; 
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionKey }));
    setShowFeedback(true); 
  };

  const handleNextQuestion = () => {
    moveToNextQuestionOrSubmit();
  };
  
  useEffect(() => {
    setShowFeedback(false);
    setTimeLeft(timePerQuestion);
  }, [currentQuestionIndex, timePerQuestion]);

  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 relative">
      {proctoringActive && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center">
          <i className="fas fa-eye mr-1"></i> Proctoring Active
          {videoRef.current && cameraStream && <video ref={videoRef} autoPlay playsInline muted className="w-16 h-12 rounded-sm ml-2 border border-red-800 object-cover"/>}
        </div>
      )}
      {cameraError && (
        <p className="text-center text-yellow-400 text-sm mb-2 p-2 bg-yellow-600/20 rounded-md">{cameraError}</p>
      )}

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">{quiz.topic}</h2>
        {quiz.isTimed && <TimerDisplay timeLeft={timeLeft} totalTime={timePerQuestion} />}
      </div>
      <p className="text-center text-neutral-400 mb-1">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
      
      <div className="w-full bg-slate-700 rounded-full h-2.5 mb-6">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <QuestionCard
        question={currentQuestion}
        onOptionSelect={handleOptionSelect}
        selectedOption={selectedAnswers[currentQuestionIndex]}
        showFeedback={showFeedback || (quiz.isTimed && timeLeft <= 0)}
        questionNumber={currentQuestionIndex + 1}
        isTimeUp={quiz.isTimed && timeLeft <= 0 && !selectedAnswers[currentQuestionIndex]}
      />

      {(showFeedback || (quiz.isTimed && timeLeft <= 0)) && (
        <div className="mt-6 text-center">
          <button
            onClick={handleNextQuestion}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <>Next Question <i className="fas fa-arrow-right ml-2"></i></>
            ) : (
              <>Finish Quiz <i className="fas fa-flag-checkered ml-2"></i></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizView;
