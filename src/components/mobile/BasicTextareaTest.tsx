import React from 'react';

// 最も基本的なテスト用textarea
const BasicTextareaTest: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>基本テスト - 素のtextarea</h2>
      <textarea
        style={{ 
          width: '100%', 
          height: '200px',
          fontSize: '16px',
          padding: '10px',
          border: '1px solid #ccc'
        }}
        placeholder="ここに文字を入力してテストしてください..."
      />
      
      <h2>uncontrolled textarea</h2>
      <textarea
        defaultValue="初期テキスト"
        style={{ 
          width: '100%', 
          height: '200px',
          fontSize: '16px',
          padding: '10px',
          border: '1px solid #ccc'
        }}
        placeholder="defaultValueを使用"
      />
    </div>
  );
};

export default BasicTextareaTest;