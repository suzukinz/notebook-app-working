import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';


interface AnimatedTimeScheduleProps {
  selectedDate?: Date | null;
}

const AnimatedTimeSchedule: React.FC<AnimatedTimeScheduleProps> = () => {

  // 蝶の位置（現在時刻）
  const getButterflyPosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const position = (totalMinutes / (24 * 60)) * 100;
    return position;
  };

  // 猫の位置（蝶より15分遅れ）
  const getCatChasePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes - 15; // 15分遅れ
    const adjustedMinutes = Math.max(0, totalMinutes);
    const position = (adjustedMinutes / (24 * 60)) * 100;
    return Math.max(0, position);
  };

  const [catPosition, setCatPosition] = useState(getCatChasePosition());
  const [butterflyPosition, setButterflyPosition] = useState(getButterflyPosition());

  // 1分ごとに猫と蝶の位置を更新
  useEffect(() => {
    const interval = setInterval(() => {
      setCatPosition(getCatChasePosition());
      setButterflyPosition(getButterflyPosition());
    }, 60000); // 1分ごと
    return () => clearInterval(interval);
  }, []);



  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };


  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* オリジナルのアニメーション背景 - 拡大版 */}
      <div 
        id="marco"
        className="relative overflow-hidden"
        style={{
          width: '100%',
          height: '400px',
          background: '#0c0207',
          borderRadius: '12px'
        }}
      >
        <div 
          id="cielo"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, #0B4C5F 0%, #04B4AE 52%, #0c0207 100%)',
            zIndex: 1
          }}
        />
        
        <div 
          id="luna"
          style={{
            position: 'absolute',
            width: '5rem',
            height: '5rem',
            borderRadius: '50%',
            boxShadow: '25px 8px 0 #F7F8E0',
            marginTop: '2rem',
            marginLeft: '65%',
            zIndex: 2
          }}
        />
        
        <div 
          id="edificios"
          style={{
            position: 'absolute',
            background: `url('https://res.cloudinary.com/pastelitos/image/upload/v1610526533/eva/edificiosOne_fsg7nx.svg')`,
            height: '50%',
            width: '100%',
            zIndex: 3,
            bottom: 0,
            backgroundPosition: '0px 0px',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
            animation: 'animar_edificios 120s linear infinite reverse'
          }}
        />
        
        <div 
          id="muro"
          style={{
            position: 'absolute',
            height: '40%',
            width: '100%',
            background: 'linear-gradient(to bottom, #416663 0%, #0c0207 19%)',
            bottom: 0,
            zIndex: 4
          }}
        />
        
        {/* 黒猫のカスタムSVGデザイン - 拡大版 */}
        <div 
          id="gato"
          style={{
            position: 'absolute',
            height: '70px',
            width: '120px',
            bottom: '25%',
            left: `${catPosition}%`,
            transform: 'translateX(-50%)',
            zIndex: 5,
            animation: 'cat-bob 0.8s ease-in-out infinite'
          }}
        >
          <svg viewBox="0 0 60 35" width="120" height="70">
            {/* 猫の体（少し薄い黒） */}
            <ellipse cx="30" cy="25" rx="15" ry="8" fill="#2d2d2d" />
            
            {/* 猫の頭（少し薄い黒） - 右向きに変更 */}
            <circle cx="40" cy="18" r="8" fill="#2d2d2d" />
            
            {/* 猫の耳（少し薄い黒） - 右向きに変更 */}
            <polygon points="34,12 37,8 40,12" fill="#2d2d2d" />
            <polygon points="40,12 43,8 46,12" fill="#2d2d2d" />
            
            {/* 猫の目（黄色） - 右向きに変更 */}
            <circle cx="37" cy="17" r="2" fill="#FFD700" />
            <circle cx="43" cy="17" r="2" fill="#FFD700" />
            
            {/* 瞳孔（黒） - 右向きに変更 */}
            <ellipse cx="37" cy="17" rx="0.5" ry="1.5" fill="#000" />
            <ellipse cx="43" cy="17" rx="0.5" ry="1.5" fill="#000" />
            
            {/* 猫の鼻（小さくピンク） - 右向きに変更 */}
            <polygon points="40,19 39,20 41,20" fill="#FF69B4" />
            
            {/* 猫の尻尾（カーブ） - 左側に変更 */}
            <path d="M18 25 Q12 18 14 10" stroke="#2d2d2d" strokeWidth="4" fill="none">
              <animate attributeName="d" 
                values="M18 25 Q12 18 14 10;M18 25 Q10 20 12 12;M18 25 Q12 18 14 10" 
                dur="0.8s" 
                repeatCount="indefinite" />
            </path>
            
            {/* 足のアニメーション用グループ */}
            <g className="cat-legs">
              {/* 前足右 */}
              <rect x="36" y="25" width="2" height="5" rx="1" fill="#2d2d2d">
                <animate attributeName="height" values="5;3;5" dur="0.4s" repeatCount="indefinite" />
                <animate attributeName="y" values="25;27;25" dur="0.4s" repeatCount="indefinite" />
              </rect>
              {/* 前足左 */}
              <rect x="42" y="25" width="2" height="5" rx="1" fill="#2d2d2d">
                <animate attributeName="height" values="5;3;5" dur="0.4s" begin="0.2s" repeatCount="indefinite" />
                <animate attributeName="y" values="25;27;25" dur="0.4s" begin="0.2s" repeatCount="indefinite" />
              </rect>
              
              {/* 後足右 */}
              <rect x="22" y="25" width="2" height="5" rx="1" fill="#2d2d2d">
                <animate attributeName="height" values="5;3;5" dur="0.4s" begin="0.1s" repeatCount="indefinite" />
                <animate attributeName="y" values="25;27;25" dur="0.4s" begin="0.1s" repeatCount="indefinite" />
              </rect>
              {/* 後足左 */}
              <rect x="28" y="25" width="2" height="5" rx="1" fill="#2d2d2d">
                <animate attributeName="height" values="5;3;5" dur="0.4s" begin="0.3s" repeatCount="indefinite" />
                <animate attributeName="y" values="25;27;25" dur="0.4s" begin="0.3s" repeatCount="indefinite" />
              </rect>
            </g>
          </svg>
        </div>
        
        {/* ヘッダー情報（アニメーション内） */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-white opacity-90" />
            <div>
              <h2 className="text-2xl font-semibold text-white drop-shadow-lg">時間の追跡</h2>
              <p className="text-sm text-white opacity-80">
                猫が蝶を追いかけています
              </p>
            </div>
          </div>
          <div className="text-white text-lg bg-black bg-opacity-30 backdrop-blur-sm px-3 py-2 rounded-lg font-medium">
            {getCurrentTimeString()}
          </div>
        </div>

        {/* 時間軸（下部） */}
        <div className="absolute bottom-2 left-4 right-4 z-10">
          <div className="flex justify-between text-xs text-white opacity-70 mb-1">
            {Array.from({ length: 13 }, (_, i) => i * 2).map(hour => (
              <span key={hour} className="font-mono">
                {hour.toString().padStart(2, '0')}:00
              </span>
            ))}
          </div>
          <div className="relative h-1 bg-white bg-opacity-20 rounded-full">
            {/* 現在時刻の蝶々 */}
            <div 
              className="absolute -top-2 transform -translate-x-1/2 z-20"
              style={{ left: `${butterflyPosition}%` }}
            >
              <div className="butterfly animate-bounce">🦋</div>
            </div>
          </div>
        </div>
      </div>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes animar_edificios {
          from { background-position: 0 0; }
          to { background-position: 100% 0; }
        }
        @-webkit-keyframes animar_edificios {
          from { background-position: 0 0; }
          to { background-position: 100% 0; }
        }
        @-ms-keyframes animar_edificios {
          from { background-position: 0 0; }
          to { background-position: 100% 0; }
        }
        @-moz-keyframes animar_edificios {
          from { background-position: 0 0; }
          to { background-position: 100% 0; }
        }
        
        @keyframes cat-bob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedTimeSchedule;