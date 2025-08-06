// 画像をBase64に変換する関数
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
};

// 画像ファイルかどうかを判定する関数
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

// 画像のサイズを制限する関数
export const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // 元の画像サイズ
      const { width, height } = img;
      
      // リサイズ比率を計算
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      
      // 新しいサイズを計算
      const newWidth = width * ratio;
      const newHeight = height * ratio;
      
      // キャンバスサイズを設定
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // 画像を描画
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Base64に変換
      const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(resizedBase64);
    };
    
    img.onerror = () => reject(new Error('画像の処理に失敗しました'));
    
    // FileをDataURLに変換してImageに設定
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};

// ファイルサイズを人間が読める形式に変換
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 画像のMarkdown記法を生成
export const generateImageMarkdown = (base64: string, alt: string = '画像', title?: string): string => {
  const titleAttribute = title ? ` "${title}"` : '';
  // Base64データに改行が含まれないようにする
  const cleanBase64 = base64.replace(/[\n\r]+/g, '');
  return `![${alt}](${cleanBase64}${titleAttribute})`;
};