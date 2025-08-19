import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';


interface AnimatedTimeScheduleProps {
  selectedDate?: Date | null;
}

const AnimatedTimeSchedule: React.FC<AnimatedTimeScheduleProps> = () => {

  // 猫の位置（現在時刻）
  const getCatPosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const position = (totalMinutes / (24 * 60)) * 100;
    return Math.max(0, Math.min(95, position)); // 95%を上限に設定
  };

  // 蝶の位置（現在時刻の正確な位置）
  const getButterflyPosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const position = (totalSeconds / (24 * 3600)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const [catPosition, setCatPosition] = useState(getCatPosition());
  const [butterflyPosition, setButterflyPosition] = useState(getButterflyPosition());
  const [, setTimeUpdate] = useState(new Date());


  // 10秒ごとに猫と蝶の位置を更新（よりスムーズな追跡）
  useEffect(() => {
    const interval = setInterval(() => {
      setCatPosition(getCatPosition());
      setButterflyPosition(getButterflyPosition());
      setTimeUpdate(new Date()); // 背景色も更新
    }, 10000); // 10秒ごと
    return () => clearInterval(interval);
  }, []);



  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 時間帯に応じた背景色を取得
  const getTimeOfDayBackground = () => {
    const hours = new Date().getHours();
    
    if (hours >= 5 && hours < 8) {
      // 早朝 (5:00-8:00)
      return 'linear-gradient(to bottom, #FFE5B4 0%, #FFD4A3 40%, #FFDAB9 100%)';
    } else if (hours >= 8 && hours < 16) {
      // 昼間 (8:00-16:00)
      return 'linear-gradient(to bottom, #87CEEB 0%, #98D8E8 40%, #B6E5F8 100%)';
    } else if (hours >= 16 && hours < 19) {
      // 夕方 (16:00-19:00)
      return 'linear-gradient(to bottom, #FF6B6B 0%, #FFA07A 40%, #FFB347 100%)';
    } else {
      // 夜 (19:00-5:00)
      return 'linear-gradient(to bottom, #0B4C5F 0%, #04B4AE 52%, #0c0207 100%)';
    }
  };

  // 太陽/月の設定
  const getSunMoonStyle = () => {
    const hours = new Date().getHours();
    
    if (hours >= 6 && hours < 18) {
      // 太陽を表示
      return {
        backgroundColor: '#FFD700',
        boxShadow: '0 0 20px #FFD700',
        top: hours >= 12 ? '1rem' : '0.5rem',
        left: hours >= 12 ? '75%' : '65%'
      };
    } else {
      // 月を表示
      return {
        backgroundColor: 'transparent',
        boxShadow: '12px 5px 0 #F7F8E0',
        top: '0.5rem',
        left: '65%'
      };
    }
  };

  // 建物の明るさを時間帯に応じて調整
  const getBuildingFilter = () => {
    const hours = new Date().getHours();
    
    if (hours >= 5 && hours < 8) {
      return 'brightness(0.9) hue-rotate(-20deg)'; // 朝の暖色
    } else if (hours >= 8 && hours < 16) {
      return 'brightness(1.1)'; // 昼の明るさ
    } else if (hours >= 16 && hours < 19) {
      return 'brightness(0.8) hue-rotate(15deg) saturate(1.5)'; // 夕方のオレンジ色
    } else {
      return 'brightness(0.6)'; // 夜の暗さ
    }
  };


  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm" style={{overflow: 'visible'}}>
      {/* オリジナルのアニメーション背景 - レスポンシブ対応 */}
      <div 
        id="marco"
        className="relative w-full h-64 sm:h-80 md:h-96 lg:h-80 xl:h-96 bg-gray-900 rounded-xl"
        style={{overflow: 'visible'}}
      >
        <div 
          id="cielo"
          className="absolute inset-0 z-10"
          style={{
            background: getTimeOfDayBackground(),
            transition: 'background 0.5s ease-in-out'
          }}
        />
        
        <div 
          id="luna"
          className="absolute rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 z-20"
          style={getSunMoonStyle()}
        />
        
        <div 
          id="edificios"
          className="absolute bottom-0 w-full h-1/2 z-30"
          style={{
            background: `url('https://res.cloudinary.com/pastelitos/image/upload/v1610526533/eva/edificiosOne_fsg7nx.svg')`,
            backgroundPosition: '0px 0px',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'cover',
            animation: 'animar_edificios 120s linear infinite',
            filter: getBuildingFilter(),
            transition: 'filter 0.5s ease-in-out'
          }}
        />
        
        <div 
          id="muro"
          className="absolute bottom-0 w-full h-2/5 z-40"
          style={{
            background: new Date().getHours() >= 6 && new Date().getHours() < 19 
              ? 'linear-gradient(to bottom, #5A6B68 0%, #2A2A2A 19%)' // 昼間は明るい道路
              : 'linear-gradient(to bottom, #416663 0%, #0c0207 19%)' // 夜は暗い道路
          }}
        />
        
        {/* 黒猫のカスタムSVGデザイン - レスポンシブ対応 */}
        <div 
          id="gato"
          className="absolute w-12 h-8 sm:w-16 sm:h-10 md:w-20 md:h-12 lg:w-24 lg:h-14 z-50"
          style={{
            bottom: '30%',
            left: `${catPosition}%`,
            transform: 'translateX(-50%)',
            animation: 'cat-bob 0.8s ease-in-out infinite'
          }}
        >
          <svg 
            viewBox="0 0 60 35" 
            className="w-full h-full"
          >
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
            
            {/* 瞳孔（黒） - 蝶を見上げる動作付き */}
            <ellipse cx="37" cy="16.5" rx="0.5" ry="1.5" fill="#000">
              <animate attributeName="cy" 
                values="16.5;16;16.5" 
                dur="2s" 
                repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="43" cy="16.5" rx="0.5" ry="1.5" fill="#000">
              <animate attributeName="cy" 
                values="16.5;16;16.5" 
                dur="2s" 
                repeatCount="indefinite" />
            </ellipse>
            
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
        
        {/* 蝶のオーバーレイ（最優先レイヤー） */}
        <div 
          className="absolute z-[9999]"
          style={{
            left: `${butterflyPosition}%`,
            top: '35%', // 猫より上の位置に配置
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          <div className="butterfly-image-container">
            <svg 
              className="butterfly-svg"
              viewBox="0 0 60 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 蝶の体 - 横向き */}
              <ellipse cx="30" cy="50" rx="12" ry="3" fill="#4A4A4A" />
              
              {/* 上左翼 - 横向き */}
              <path 
                className="wing-top-left"
                d="M 30 50 Q 15 35, 10 20 Q 15 10, 25 15 Q 30 25, 30 50"
                fill="url(#gradient1)"
                opacity="0.9"
              />
              
              {/* 上右翼 - 横向き */}
              <path 
                className="wing-top-right"
                d="M 30 50 Q 35 35, 45 25 Q 50 20, 50 25 Q 40 35, 30 50"
                fill="url(#gradient2)"
                opacity="0.9"
              />
              
              {/* 下左翼 - 横向き */}
              <path 
                className="wing-bottom-left"
                d="M 30 50 Q 15 65, 10 80 Q 15 90, 25 85 Q 30 75, 30 50"
                fill="url(#gradient1)"
                opacity="0.9"
              />
              
              {/* 下右翼 - 横向き */}
              <path 
                className="wing-bottom-right"
                d="M 30 50 Q 35 65, 45 75 Q 50 80, 50 75 Q 40 65, 30 50"
                fill="url(#gradient2)"
                opacity="0.9"
              />
              
              {/* グラデーション定義 */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF6B6B',stopOpacity:1}} />
                  <stop offset="50%" style={{stopColor:'#FFE66D',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#4ECDC4',stopOpacity:1}} />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#A8E6CF',stopOpacity:1}} />
                  <stop offset="50%" style={{stopColor:'#7FD1AE',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#81C784',stopOpacity:1}} />
                </linearGradient>
              </defs>
              
              {/* 翼の模様 - 横向き */}
              <circle cx="20" cy="30" r="3" fill="#FFFFFF" opacity="0.7" />
              <circle cx="20" cy="70" r="3" fill="#FFFFFF" opacity="0.7" />
              <circle cx="40" cy="35" r="2" fill="#333333" opacity="0.5" />
              <circle cx="40" cy="65" r="2" fill="#333333" opacity="0.5" />
            </svg>
          </div>
        </div>

        {/* ヘッダー情報（アニメーション内） - レスポンシブ対応 */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-6 right-2 sm:right-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white opacity-90" />
            <div>
              <h2 className="text-lg sm:text-2xl font-semibold text-white drop-shadow-lg">時間の追跡</h2>
              <p className="text-xs sm:text-sm text-white opacity-80">
                猫が蝶を追いかけています
              </p>
            </div>
          </div>
          <div className="text-white text-sm sm:text-lg bg-black bg-opacity-30 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-medium">
            {getCurrentTimeString()}
          </div>
        </div>

        {/* 時間軸（下部） - レスポンシブ対応 */}
        <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-4 z-10">
          <div className="hidden sm:flex justify-between text-xs text-white opacity-70 mb-1">
            {Array.from({ length: 13 }, (_, i) => i * 2).map(hour => (
              <span key={hour} className="font-mono">
                {hour.toString().padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {/* モバイル用簡略版 */}
          <div className="flex sm:hidden justify-between text-xs text-white opacity-70 mb-1">
            {Array.from({ length: 5 }, (_, i) => i * 6).map(hour => (
              <span key={hour} className="font-mono">
                {hour.toString().padStart(2, '0')}:00
              </span>
            ))}
          </div>
          <div className="relative h-1 bg-white bg-opacity-20 rounded-full">
            {/* 蝶のマーカー（時間軸上） */}
            <div 
              className="absolute -top-8 transform -translate-x-1/2"
              style={{ 
                left: `${butterflyPosition}%`,
                pointerEvents: 'none'
              }}
            >
              <div className="text-center">
                <div className="text-white text-xs font-bold mb-1 drop-shadow-lg">
                  {getCurrentTimeString()}
                </div>
                <div className="butterfly-mini">
                  🦋
                </div>
              </div>
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
        
        /* SVGベースの蝶アニメーション */
        .butterfly-image-container {
          position: relative;
          transform-style: preserve-3d;
          animation: butterfly-float 4s ease-in-out infinite;
        }
        
        .butterfly-svg {
          width: 15px;
          height: auto;
          transform: rotateY(0deg); /* 横向きに */
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
        }
        
        /* 翼のアニメーション - 横向き */
        .wing-top-left, .wing-bottom-left {
          transform-origin: 30px 50px;
          animation: wing-flap-top 0.5s ease-in-out infinite;
        }
        
        .wing-top-right, .wing-bottom-right {
          transform-origin: 30px 50px;
          animation: wing-flap-bottom 0.5s ease-in-out infinite;
        }
        
        /* ミニ蝶（時間軸用） */
        .butterfly-mini {
          font-size: 12px;
          animation: mini-butterfly-pulse 2s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
        }
        
        @keyframes wing-flap-top {
          0%, 100% {
            transform: rotateX(0deg) scaleY(1);
          }
          50% {
            transform: rotateX(-45deg) scaleY(0.7);
          }
        }
        
        @keyframes wing-flap-bottom {
          0%, 100% {
            transform: rotateX(0deg) scaleY(1);
          }
          50% {
            transform: rotateX(45deg) scaleY(0.7);
          }
        }
        
        @keyframes butterfly-float {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-6px) translateX(2px);
          }
          50% {
            transform: translateY(-3px) translateX(-1px);
          }
          75% {
            transform: translateY(-8px) translateX(3px);
          }
        }
        
        @keyframes mini-butterfly-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes cat-bob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-2px); }
        }
        
        /* 月の影 - レスポンシブサイズ */
        #luna {
          box-shadow: 12px 5px 0 #F7F8E0;
        }
        
        @media (min-width: 640px) {
          #luna {
            box-shadow: 15px 6px 0 #F7F8E0;
          }
        }
        
        @media (min-width: 768px) {
          #luna {
            box-shadow: 20px 8px 0 #F7F8E0;
          }
        }
        
        @media (min-width: 1024px) {
          #luna {
            box-shadow: 25px 10px 0 #F7F8E0;
          }
        }
        
        /* 背景のレスポンシブ対応 */
        @media (max-width: 640px) {
          #edificios {
            background-size: auto 100% !important;
          }
          
          .butterfly-svg {
            width: 10px;
          }
        }
        
        @media (min-width: 768px) {
          .butterfly-svg {
            width: 18px;
          }
        }
        
        @media (min-width: 1024px) {
          .butterfly-svg {
            width: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedTimeSchedule;