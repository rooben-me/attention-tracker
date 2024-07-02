import { useState, useEffect } from 'react';

export default function GameUI({ isAttentive, score, streak, level }) {
  const [animation, setAnimation] = useState('');

  useEffect(() => {
    if (isAttentive) {
      setAnimation('animate-pulse');
      setTimeout(() => setAnimation(''), 1000);
    }
  }, [isAttentive]);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-t-3xl shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-bold">Level {level}</h2>
        <div className={`text-3xl font-bold ${isAttentive ? 'text-green-400' : 'text-yellow-400'} ${animation}`}>
          {isAttentive ? 'Focused!' : 'Look at the camera'}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl">
          <p>Score: {score}</p>
          <p>Streak: {streak}</p>
        </div>
        <div className="w-1/2 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500 ease-in-out"
            style={{width: `${Math.min((score + 50) / 150 * 100, 100)}%`}}
          ></div>
        </div>
      </div>
      <div className="text-center text-lg">
        {streak > 0 ? `Next level in ${10 - (streak % 10)} focused moments!` : 'Keep focusing to level up!'}
      </div>
    </div>
  );
}