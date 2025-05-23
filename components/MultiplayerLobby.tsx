import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, addDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import CopyLinkButton from './CopyLinkButton';
import { generateQuiz as generateQuizFromAPI } from '../services/geminiService';

interface MultiplayerLobbyProps {
  onStartQuiz: (quizId: string, roomId: string) => void;
  autoJoinRoomId?: string | null;
}

interface RoomData {
  id: string;
  hostId: string;
  hostName: string;
  participants: { id: string; name: string }[];
  quizId?: string;
  started: boolean;
  createdAt: any;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onStartQuiz, autoJoinRoomId }) => {
  const { currentUser } = useAuth();
  const [roomId, setRoomId] = useState<string>('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<{id: string, name: string, text: string, timestamp: number}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  useEffect(() => {
    if (autoJoinRoomId) {
      setRoomId(autoJoinRoomId);
    }
  }, [autoJoinRoomId]);

  // Create a new room
  const handleCreateRoom = async () => {
    if (!currentUser) return;
    setCreating(true);
    setError('');
    try {
      const roomRef = await addDoc(collection(db, 'multiplayerRooms'), {
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email || 'Anonymous',
        participants: [{ id: currentUser.uid, name: currentUser.displayName || currentUser.email || 'Anonymous' }],
        started: false,
        createdAt: serverTimestamp(),
      });
      setRoomId(roomRef.id);
      setRoomData({
        id: roomRef.id,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email || 'Anonymous',
        participants: [{ id: currentUser.uid, name: currentUser.displayName || currentUser.email || 'Anonymous' }],
        started: false,
        createdAt: new Date(),
      });
    } catch (e) {
      setError('Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  // Join an existing room
  const handleJoinRoom = async () => {
    if (!currentUser || !joinCode) return;
    setJoining(true);
    setError('');
    try {
      const roomRef = doc(db, 'multiplayerRooms', joinCode);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        setError('Room not found.');
        setJoining(false);
        return;
      }
      const data = roomSnap.data();
      // Add user to participants if not already present
      const alreadyIn = data.participants.some((p: any) => p.id === currentUser.uid);
      if (!alreadyIn) {
        await updateDoc(roomRef, {
          participants: arrayUnion({ id: currentUser.uid, name: currentUser.displayName || currentUser.email || 'Anonymous' })
        });
      }
      setRoomId(joinCode);
    } catch (e) {
      setError('Failed to join room.');
    } finally {
      setJoining(false);
    }
  };

  // Listen for room updates
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'multiplayerRooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        setRoomData({ id: roomId, ...docSnap.data() } as RoomData);
      }
    });
    return () => unsub();
  }, [roomId]);

  // Listen for chat updates
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(collection(db, 'multiplayerRooms', roomId, 'chat'), (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => doc.data() as any).sort((a, b) => a.timestamp - b.timestamp));
    });
    return () => unsub();
  }, [roomId]);

  // Listen for quiz start and leaderboard updates
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, 'multiplayerRooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      const data = docSnap.data();
      if (data?.quizData) {
        setQuiz(data.quizData);
        setQuizStarted(true);
      }
      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
        setShowLeaderboard(true);
      }
    });
    return () => unsubRoom();
  }, [roomId]);

  // Host starts the quiz
  const handleStartQuiz = async () => {
    if (!roomData || !currentUser || roomData.hostId !== currentUser.uid) return;
    // Generate a quiz (for demo, use fixed topic)
    const quizData = await generateQuizFromAPI('General Knowledge', 5);
    await updateDoc(doc(db, 'multiplayerRooms', roomId), {
      quizData,
      quizStarted: true,
      leaderboard: [],
    });
    setQuiz(quizData);
    setQuizStarted(true);
  };

  // Submit answers
  const handleSubmitQuiz = async (userAnswers: Record<number, string>) => {
    if (!quiz || !currentUser) return;
    let calculatedScore = 0;
    quiz.questions.forEach((q: any, idx: number) => {
      if (userAnswers[idx] === q.correctAnswer) calculatedScore++;
    });
    setScore(calculatedScore);
    setAnswers(userAnswers);
    // Add to leaderboard in Firestore
    const roomRef = doc(db, 'multiplayerRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    const data = roomSnap.data();
    const newEntry = {
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      score: calculatedScore,
      timestamp: Date.now(),
    };
    const updatedLeaderboard = [...(data?.leaderboard || []).filter((e: any) => e.id !== newEntry.id), newEntry];
    await updateDoc(roomRef, { leaderboard: updatedLeaderboard });
    setLeaderboard(updatedLeaderboard);
    setShowLeaderboard(true);
  };

  // Rematch
  const handleRematch = async () => {
    setRematchLoading(true);
    setQuiz(null);
    setQuizStarted(false);
    setAnswers({});
    setScore(null);
    setShowLeaderboard(false);
    // Host generates a new quiz
    if (currentUser && roomData && currentUser.uid === roomData.hostId) {
      const quizData = await generateQuizFromAPI('General Knowledge', 5);
      await updateDoc(doc(db, 'multiplayerRooms', roomId), {
        quizData,
        quizStarted: true,
        leaderboard: [],
      });
      setQuiz(quizData);
      setQuizStarted(true);
    }
    setRematchLoading(false);
  };

  // Confetti (simple)
  useEffect(() => {
    if (showLeaderboard && leaderboard.length > 0 && typeof window !== 'undefined') {
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    }
  }, [showLeaderboard]);

  // Copy room code
  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Send chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !roomId || !chatInput.trim()) return;
    await addDoc(collection(db, 'multiplayerRooms', roomId, 'chat'), {
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      text: chatInput,
      timestamp: Date.now(),
    });
    setChatInput('');
  };

  // UI
  if (roomId && !roomData) {
    // Show a loading spinner or placeholder while roomData loads
    return (
      <div className="bg-slate-800/80 rounded-xl shadow-2xl p-8 max-w-lg mx-auto mt-10 text-center animate-fadeInUp">
        <h2 className="text-3xl font-bold mb-4 text-purple-300">Loading Room...</h2>
        <div className="flex justify-center items-center h-32">
          <span className="loader border-4 border-purple-400 border-t-transparent rounded-full w-12 h-12 animate-spin"></span>
        </div>
        <p className="text-neutral-400 mt-6">Please wait while we set up your multiplayer room.</p>
      </div>
    );
  }
  if (roomData) {
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    if (quizStarted && quiz && !showLeaderboard) {
      // Render quiz view for multiplayer
      return (
        <div className="bg-slate-800/80 rounded-xl shadow-2xl p-8 max-w-lg mx-auto mt-10 text-center animate-fadeInUp">
          <h2 className="text-3xl font-bold mb-4 text-purple-300">Multiplayer Quiz</h2>
          {/* Render questions and options, collect answers, submit button */}
          {/* For brevity, only a simple version is shown here */}
          {quiz.questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 text-left">
              <div className="font-semibold text-neutral-100 mb-2">{idx + 1}. {q.question}</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(q.options).map(([opt, text]: any) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers(a => ({ ...a, [idx]: opt }))}
                    className={`py-2 px-3 rounded border ${answers[idx] === opt ? 'bg-purple-500 text-white' : 'bg-slate-700 text-neutral-200'} hover:bg-purple-600 transition-all`}
                  >
                    <span className="font-bold mr-2">{opt}.</span> {text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => handleSubmitQuiz(answers)}
            className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Submit Answers
          </button>
        </div>
      );
    }
    if (showLeaderboard) {
      // Render leaderboard with confetti and rematch
      return (
        <div className="bg-slate-800/80 rounded-xl shadow-2xl p-8 max-w-lg mx-auto mt-10 text-center animate-fadeInUp">
          <h2 className="text-3xl font-bold mb-4 text-yellow-300">Leaderboard</h2>
          <div className="mb-6">
            {leaderboard.sort((a, b) => b.score - a.score).map((entry, idx) => (
              <div key={entry.id} className={`flex items-center justify-between px-4 py-2 rounded-lg mb-2 ${idx === 0 ? 'bg-yellow-500/20' : 'bg-slate-700/40'}`}> 
                <div className="flex items-center gap-2">
                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${entry.id}`} alt="avatar" className="w-7 h-7 rounded-full border border-purple-400" />
                  <span className="font-bold text-neutral-100">{entry.name}</span>
                </div>
                <span className="text-lg font-bold text-green-400">{entry.score}</span>
                {idx === 0 && <span className="ml-2 text-yellow-400 font-bold">🏆 Winner!</span>}
              </div>
            ))}
          </div>
          <button
            onClick={handleRematch}
            disabled={rematchLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            {rematchLoading ? 'Rematching...' : 'Rematch'}
          </button>
        </div>
      );
    }
    return (
      <div className="bg-slate-800/80 rounded-xl shadow-2xl p-8 max-w-lg mx-auto mt-10 text-center animate-fadeInUp">
        <h2 className="text-3xl font-bold mb-4 text-purple-300">Multiplayer Room</h2>
        <button onClick={() => setShareModalOpen(true)} className="mb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded shadow hover:from-purple-600 hover:to-pink-600 transition-all">Share Room Link</button>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-neutral-100 mb-2">Participants:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {roomData.participants.map((p) => (
              <div key={p.id} className="bg-purple-700/30 px-4 py-2 rounded-full text-neutral-100 font-medium flex items-center gap-2">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`} alt="avatar" className="w-7 h-7 rounded-full border border-purple-400" />
                {p.name}
                {p.id === roomData.hostId && <span className="ml-2 text-xs text-yellow-400">Host</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="mb-6 bg-slate-900/80 rounded-lg p-4 max-h-48 overflow-y-auto text-left">
          <h4 className="text-purple-300 font-semibold mb-2">Lobby Chat</h4>
          <div className="space-y-1 mb-2">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.id}`} alt="avatar" className="w-5 h-5 rounded-full border border-purple-400" />
                <span className="font-bold text-purple-200">{msg.name}:</span>
                <span className="text-neutral-200">{msg.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-neutral-100 focus:outline-none"
              maxLength={200}
            />
            <button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded">Send</button>
          </form>
        </div>
        {!roomData.started ? (
          <>
            {currentUser.uid === roomData.hostId ? (
              <button onClick={handleStartQuiz} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 mt-4">
                <i className="fas fa-play mr-2"></i> Start Quiz
              </button>
            ) : (
              <p className="text-green-400 mt-4">Waiting for host to start the quiz...</p>
            )}
          </>
        ) : (
          <p className="text-green-400 mt-4">Quiz started! Check your screen.</p>
        )}
        {shareModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative animate-fadeInUp">
              <button onClick={() => setShareModalOpen(false)} className="absolute top-2 right-2 text-neutral-400 hover:text-red-400 text-xl">&times;</button>
              <h2 className="text-2xl font-bold mb-4 text-purple-300">Share Room Link</h2>
              <p className="mb-2 text-neutral-200">Send this link to friends to join:</p>
              <div className="mb-4 break-all text-blue-400 font-mono text-sm bg-slate-800 rounded p-2 select-all">{roomLink}</div>
              <CopyLinkButton link={roomLink} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-xl shadow-2xl p-8 max-w-lg mx-auto mt-10 text-center animate-fadeInUp">
      <h2 className="text-3xl font-bold mb-6 text-purple-300">Multiplayer Quiz</h2>
      <div className="mb-6">
        <button onClick={handleCreateRoom} disabled={creating} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 mr-4">
          <i className="fas fa-plus-circle mr-2"></i> {creating ? 'Creating...' : 'Create Room'}
        </button>
        <span className="text-neutral-400 font-medium">or</span>
        <input
          type="text"
          placeholder="Enter Room Code"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value)}
          className="ml-4 px-4 py-2 rounded border border-slate-600 bg-slate-900 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button onClick={handleJoinRoom} disabled={joining} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200">
          <i className="fas fa-sign-in-alt mr-1"></i> {joining ? 'Joining...' : 'Join'}
        </button>
      </div>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      <p className="text-neutral-400 mt-6">Create a room and share the code, or join a friend's room to play together!</p>
    </div>
  );
};

export default MultiplayerLobby; 