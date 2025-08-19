import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Square, RotateCcw, Check, X, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useHaptics } from '../../hooks/useHaptics';
import VoiceInputWaveform from './VoiceInputWaveform';
import BottomSheet from './BottomSheet';

interface EnhancedVoiceInputProps {
  isVisible: boolean;
  onClose: () => void;
  onTextResult: (text: string) => void;
  placeholder?: string;
  language?: string;
}

const EnhancedVoiceInput: React.FC<EnhancedVoiceInputProps> = ({
  isVisible,
  onClose,
  onTextResult,
  placeholder = 'マイクボタンを押して話してください...',
  language = 'ja-JP'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream>();
  const [recordedText, setRecordedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const { successFeedback, errorFeedback, tapFeedback } = useHaptics();

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setRecordedText(prev => prev + text);
        setConfidence(0.8); // 仮の信頼度
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
      errorFeedback();
      handleStopRecording();
    }
  });

  // 録音時間の更新
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // マイクアクセスの取得
  const getMicrophoneAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      setAudioStream(stream);
      return stream;
    } catch (error) {
      console.error('Microphone access denied:', error);
      errorFeedback();
      throw error;
    }
  }, [errorFeedback]);

  // 録音開始
  const handleStartRecording = useCallback(async () => {
    if (!isSupported) {
      alert('このブラウザは音声認識をサポートしていません。');
      return;
    }

    try {
      await getMicrophoneAccess();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setRecordedText('');
      setConfidence(0);
      resetTranscript();
      startListening();
      successFeedback();
    } catch (error) {
      console.error('Failed to start recording:', error);
      errorFeedback();
    }
  }, [isSupported, getMicrophoneAccess, resetTranscript, startListening, successFeedback, errorFeedback]);

  // 録音停止
  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    stopListening();
    
    // オーディオストリームを停止
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(undefined);
    }
    
    tapFeedback();
  }, [stopListening, audioStream, tapFeedback]);

  // 録音一時停止/再開
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startListening();
      successFeedback();
    } else {
      setIsPaused(true);
      stopListening();
      tapFeedback();
    }
  }, [isPaused, startListening, stopListening, successFeedback, tapFeedback]);

  // リセット
  const handleReset = useCallback(() => {
    setRecordedText('');
    setConfidence(0);
    setRecordingDuration(0);
    resetTranscript();
    tapFeedback();
  }, [resetTranscript, tapFeedback]);

  // 確定
  const handleConfirm = useCallback(() => {
    const finalText = recordedText + transcript + interimTranscript;
    if (finalText.trim()) {
      onTextResult(finalText.trim());
      successFeedback();
    }
    handleStopRecording();
    onClose();
  }, [recordedText, transcript, interimTranscript, onTextResult, successFeedback, handleStopRecording, onClose]);

  // キャンセル
  const handleCancel = useCallback(() => {
    handleStopRecording();
    onClose();
    tapFeedback();
  }, [handleStopRecording, onClose, tapFeedback]);

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 音声認識がサポートされていない場合
  if (!isSupported) {
    return (
      <BottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title="音声入力"
        snapPoints={[0.4]}
        showDragHandle={true}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MicOff size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            音声認識が利用できません
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            お使いのブラウザは音声認識機能をサポートしていません。
          </p>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="音声入力"
      snapPoints={[0.5, 0.8]}
      initialSnapPoint={0}
      showDragHandle={true}
    >
      <div className="p-6 space-y-6">
        {/* 波形表示 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          {audioStream && (
            <VoiceInputWaveform
              isRecording={isListening}
              audioStream={audioStream}
              width={280}
            height={80}
            color="#3b82f6"
            sensitivity={1.2}
            smoothing={0.7}
            />
          )}
          
          {/* 録音時間と信頼度 */}
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
            <span>録音時間: {formatTime(recordingDuration)}</span>
            {confidence > 0 && (
              <span>認識精度: {Math.round(confidence * 100)}%</span>
            )}
          </div>
        </div>

        {/* テキスト表示エリア */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 min-h-32">
          <div className="text-gray-900 dark:text-white">
            {/* 確定済みテキスト */}
            <span>{recordedText}</span>
            {/* 認識中テキスト（確定済み） */}
            <span className="text-blue-600 dark:text-blue-400">{transcript}</span>
            {/* 認識中テキスト（仮） */}
            <span className="text-gray-500 dark:text-gray-400 italic">
              {interimTranscript}
            </span>
          </div>
          
          {/* プレースホルダー */}
          {!recordedText && !transcript && !interimTranscript && (
            <p className="text-gray-400 dark:text-gray-500 italic">
              {placeholder}
            </p>
          )}
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center justify-center space-x-4">
          {/* リセットボタン */}
          <button
            onClick={handleReset}
            disabled={!recordedText && !transcript}
            className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <RotateCcw size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* 一時停止/再開ボタン */}
          {isRecording && (
            <button
              onClick={handlePauseResume}
              className="p-3 bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-full transition-colors"
            >
              {isPaused ? (
                <Play size={20} className="text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Pause size={20} className="text-yellow-600 dark:text-yellow-400" />
              )}
            </button>
          )}

          {/* メイン録音ボタン */}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`p-4 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600'
            } shadow-lg`}
          >
            {isRecording ? (
              <Square size={24} className="text-white" />
            ) : (
              <Mic size={24} className="text-white" />
            )}
          </button>

          {/* 音量ボタン（将来の拡張用） */}
          <button
            className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            disabled
          >
            <Volume2 size={20} className="text-gray-400" />
          </button>
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            <X size={18} className="inline mr-2" />
            キャンセル
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!recordedText && !transcript && !interimTranscript}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            <Check size={18} className="inline mr-2" />
            確定
          </button>
        </div>

        {/* ヒント */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
          <p>• 明瞭に話すと認識精度が向上します</p>
          <p>• 長い文章は区切って話すことをお勧めします</p>
          <p>• 録音中はマイクに近づいて話してください</p>
        </div>
      </div>
    </BottomSheet>
  );
};

export default EnhancedVoiceInput;