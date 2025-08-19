import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VoiceInputWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  sensitivity?: number;
  smoothing?: number;
}

const VoiceInputWaveform: React.FC<VoiceInputWaveformProps> = ({
  isRecording,
  audioStream,
  width = 300,
  height = 60,
  color = '#3b82f6',
  backgroundColor = 'transparent',
  sensitivity = 1.5,
  smoothing = 0.8
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const [audioLevels, setAudioLevels] = useState<number[]>([]);

  // オーディオコンテキストとアナライザーを設定
  useEffect(() => {
    if (!audioStream || !isRecording) {
      if (analyserRef.current) {
        analyserRef.current = undefined;
        dataArrayRef.current = undefined;
      }
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = smoothing;
      microphone.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      return () => {
        try {
          microphone.disconnect();
          audioContext.close();
        } catch (error) {
          console.warn('Error cleaning up audio context:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
      return;
    }
  }, [audioStream, isRecording, smoothing]);

  // 波形データを計算
  const calculateWaveformData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return Array(20).fill(0);
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    const waveformBars = 20;
    const dataPerBar = Math.floor(dataArrayRef.current.length / waveformBars);
    const waveform: number[] = [];

    for (let i = 0; i < waveformBars; i++) {
      let sum = 0;
      const start = i * dataPerBar;
      const end = start + dataPerBar;

      for (let j = start; j < end && j < dataArrayRef.current.length; j++) {
        sum += dataArrayRef.current[j] || 0;
      }

      const average = sum / dataPerBar;
      const normalized = (average / 255) * sensitivity;
      waveform.push(Math.min(normalized, 1));
    }

    return waveform;
  }, [sensitivity]);

  // アニメーションループ
  const animate = useCallback(() => {
    if (!isRecording) return;

    const newLevels = calculateWaveformData();
    setAudioLevels(newLevels);

    animationIdRef.current = requestAnimationFrame(animate);
  }, [isRecording, calculateWaveformData]);

  // アニメーション開始/停止
  useEffect(() => {
    if (isRecording) {
      animate();
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // 録音停止時は徐々にフェードアウト
      const fadeOut = () => {
        setAudioLevels(prev => prev.map(level => level * 0.95));
      };
      const fadeInterval = setInterval(fadeOut, 50);
      setTimeout(() => {
        clearInterval(fadeInterval);
        setAudioLevels(Array(20).fill(0));
      }, 1000);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isRecording, animate]);

  // Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvasサイズを設定
    canvas.width = width;
    canvas.height = height;

    // 背景をクリア
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // バーを描画
    const barWidth = width / audioLevels.length;
    const maxBarHeight = height - 10; // 上下に余白を設ける

    audioLevels.forEach((level, index) => {
      const barHeight = Math.max(level * maxBarHeight, 2); // 最小高さを2pxに設定
      const x = index * barWidth + barWidth * 0.1; // 左右に少し余白
      const y = (height - barHeight) / 2; // 中央に配置
      const actualBarWidth = barWidth * 0.8; // バー同士の間隔を作る

      // グラデーション作成
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '80'); // 50%透明度

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // 光る効果
      if (level > 0.7) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
        ctx.shadowBlur = 0;
      }
    });
  }, [audioLevels, width, height, color, backgroundColor]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{
          filter: isRecording ? 'none' : 'grayscale(100%)',
          transition: 'filter 0.3s ease'
        }}
      />
      
      {/* 録音状態のインジケーター */}
      <div className="ml-3 flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isRecording ? '録音中...' : '待機中'}
        </span>
      </div>
    </div>
  );
};

export default VoiceInputWaveform;