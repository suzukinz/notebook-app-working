import React, { Profiler } from 'react';
import { logger } from '../../utils/logger';

interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  logSlowRenders?: boolean;
  slowThreshold?: number;
}

const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  logSlowRenders = true,
  slowThreshold = 16 // 1フレーム (16ms) 以上
}) => {
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    _baseDuration: number,
    _startTime: number,
    _commitTime: number,
    _interactions: Set<{ id: number; name: string; timestamp: number }>
  ) => {
    // 遅いレンダリングを検出してログ出力
    if (logSlowRenders && actualDuration > slowThreshold) {
      logger.warn(`Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms (threshold: ${slowThreshold}ms)`);
    }

    // 開発環境でのみ詳細ログ
    if (process.env.NODE_ENV === 'development' && actualDuration > 5) {
      console.log(`Performance: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
    }
  };

  return (
    <Profiler id={id} onRender={onRenderCallback as any}>
      {children}
    </Profiler>
  );
};

export default PerformanceProfiler;