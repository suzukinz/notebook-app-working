import React from 'react';
import { DashboardStats } from '../../utils/analytics';

interface ActivityChartProps {
  data: DashboardStats['weekActivity'];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const maxActivity = Math.max(...data.map(d => d.activity), 1);
  
  const getDayName = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()] || '日';
  };

  const getBarColor = (activity: number): string => {
    if (activity === 0) return 'bg-gray-200 dark:bg-gray-700';
    const ratio = activity / maxActivity;
    if (ratio >= 0.8) return 'bg-green-500 dark:bg-green-400';
    if (ratio >= 0.6) return 'bg-green-400 dark:bg-green-500';
    if (ratio >= 0.4) return 'bg-green-300 dark:bg-green-600';
    return 'bg-green-200 dark:bg-green-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 space-x-2">
        {data.map((day) => (
          <div key={day.date} className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col justify-end h-24 mb-2">
              <div 
                className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${getBarColor(day.activity)}`}
                style={{ 
                  height: day.activity === 0 ? '4px' : `${Math.max((day.activity / maxActivity) * 100, 8)}%` 
                }}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {getDayName(day.date)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>7日前</span>
        <span>今日</span>
      </div>
      
      <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          <span>活動なし</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-200 dark:bg-green-700 rounded" />
          <span>少ない</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-400 dark:bg-green-500 rounded" />
          <span>多い</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded" />
          <span>非常に多い</span>
        </div>
      </div>
      
      {data.length > 0 && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            今週の総アクティビティ: <span className="font-semibold">{data.reduce((sum, d) => sum + d.activity, 0)}</span> 件
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityChart;