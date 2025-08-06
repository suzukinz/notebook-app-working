// データ検証とサニタイゼーション用ユーティリティ

// 文字数制限の定数
export const LIMITS = {
  NOTE_TITLE_MAX: 200,
  NOTE_CONTENT_MAX: 500000, // 50万文字
  WORKSPACE_NAME_MAX: 100,
  NOTEBOOK_NAME_MAX: 100,
  FOLDER_NAME_MAX: 100,
  TAG_MAX: 50,
  TAG_COUNT_MAX: 20,
  IMAGE_SIZE_MAX: 10 * 1024 * 1024, // 10MB
} as const;

// サポートされる画像形式
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

// 危険なHTMLタグとイベントハンドラ
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select',
  'button', 'link', 'meta', 'style', 'base', 'frame', 'frameset', 'applet'
];

const DANGEROUS_ATTRIBUTES = [
  'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown',
  'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
  // eslint-disable-next-line no-script-url
  'onchange', 'onsubmit', 'onreset', 'javascript:', 'vbscript:', 'data:'
];

// 基本的な文字列検証
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

// 文字列の長さを検証
export const validateStringLength = (
  value: string, 
  maxLength: number, 
  fieldName: string = 'フィールド'
): ValidationResult => {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName}は文字列である必要があります`
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName}は${maxLength}文字以内で入力してください（現在: ${value.length}文字）`
    };
  }

  return { isValid: true };
};

// 空文字・null・undefinedをチェック
export const validateRequired = (
  value: any, 
  fieldName: string = 'フィールド'
): ValidationResult => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return {
      isValid: false,
      error: `${fieldName}は必須項目です`
    };
  }

  return { isValid: true };
};

// 制御文字と危険な文字を除去
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // NULL文字を除去（既に上記で除去済み）
    // 先頭末尾の空白を除去
    .trim();
};

// HTMLコンテンツをサニタイズ
export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';

  let sanitized = html;

  // 危険なタグを除去
  DANGEROUS_TAGS.forEach(tag => {
    const regex = new RegExp(`<\\s*/?\\s*${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // 危険な属性を除去
  DANGEROUS_ATTRIBUTES.forEach(attr => {
    const regex = new RegExp(`\\s*${attr.replace(':', '\\:')}\\s*=\\s*['""][^'""]*['""]`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // JavaScript URLを除去
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

  return sanitized;
};

// ノートタイトルを検証
export const validateNoteTitle = (title: string): ValidationResult => {
  const requiredCheck = validateRequired(title, 'ノートタイトル');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateStringLength(title, LIMITS.NOTE_TITLE_MAX, 'ノートタイトル');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeString(title);
  
  return {
    isValid: true,
    sanitized
  };
};

// ノートコンテンツを検証・サニタイズ
export const validateNoteContent = (content: string): ValidationResult => {
  if (!content) {
    return {
      isValid: true,
      sanitized: ''
    };
  }

  const lengthCheck = validateStringLength(content, LIMITS.NOTE_CONTENT_MAX, 'ノート内容');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeHtml(content);
  
  return {
    isValid: true,
    sanitized
  };
};

// ワークスペース名を検証
export const validateWorkspaceName = (name: string): ValidationResult => {
  const requiredCheck = validateRequired(name, 'ワークスペース名');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateStringLength(name, LIMITS.WORKSPACE_NAME_MAX, 'ワークスペース名');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeString(name);
  
  return {
    isValid: true,
    sanitized
  };
};

// ノートブック名を検証
export const validateNotebookName = (name: string): ValidationResult => {
  const requiredCheck = validateRequired(name, 'ノートブック名');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateStringLength(name, LIMITS.NOTEBOOK_NAME_MAX, 'ノートブック名');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeString(name);
  
  return {
    isValid: true,
    sanitized
  };
};

// フォルダ名を検証
export const validateFolderName = (name: string): ValidationResult => {
  const requiredCheck = validateRequired(name, 'フォルダ名');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateStringLength(name, LIMITS.FOLDER_NAME_MAX, 'フォルダ名');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeString(name);
  
  return {
    isValid: true,
    sanitized
  };
};

// タグを検証
export const validateTag = (tag: string): ValidationResult => {
  const requiredCheck = validateRequired(tag, 'タグ');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateStringLength(tag, LIMITS.TAG_MAX, 'タグ');
  if (!lengthCheck.isValid) return lengthCheck;

  const sanitized = sanitizeString(tag);
  
  // タグに特殊文字が含まれていないかチェック
  if (!/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s\-_]+$/.test(sanitized)) {
    return {
      isValid: false,
      error: 'タグには英数字、ひらがな、カタカナ、漢字、ハイフン、アンダースコアのみ使用できます'
    };
  }
  
  return {
    isValid: true,
    sanitized
  };
};

// タグ配列を検証
export const validateTags = (tags: string[]): ValidationResult => {
  if (!Array.isArray(tags)) {
    return {
      isValid: false,
      error: 'タグは配列である必要があります'
    };
  }

  if (tags.length > LIMITS.TAG_COUNT_MAX) {
    return {
      isValid: false,
      error: `タグは${LIMITS.TAG_COUNT_MAX}個まで設定できます`
    };
  }

  const sanitizedTags: string[] = [];
  
  for (const tag of tags) {
    const validation = validateTag(tag);
    if (!validation.isValid) {
      return validation;
    }
    if (validation.sanitized) {
      sanitizedTags.push(validation.sanitized);
    }
  }

  return {
    isValid: true,
    sanitized: JSON.stringify(sanitizedTags)
  };
};

// ファイル検証
export const validateImageFile = (file: File): ValidationResult => {
  if (!file) {
    return {
      isValid: false,
      error: 'ファイルが選択されていません'
    };
  }

  // ファイルサイズチェック
  if (file.size > LIMITS.IMAGE_SIZE_MAX) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (LIMITS.IMAGE_SIZE_MAX / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます（${sizeMB}MB / 最大${maxSizeMB}MB）`
    };
  }

  // MIME タイプチェック
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: `サポートされていないファイル形式です。対応形式: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    };
  }

  // ファイル名チェック（危険な拡張子を除去）
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.js', '.vbs'];
  const fileName = file.name.toLowerCase();
  
  for (const ext of dangerousExtensions) {
    if (fileName.endsWith(ext)) {
      return {
        isValid: false,
        error: '危険なファイル形式が検出されました'
      };
    }
  }

  return { isValid: true };
};

// Base64画像データを検証
export const validateBase64Image = (base64: string): ValidationResult => {
  if (!base64 || typeof base64 !== 'string') {
    return {
      isValid: false,
      error: '画像データが無効です'
    };
  }

  // データURLの形式チェック
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/;
  if (!dataUrlRegex.test(base64)) {
    return {
      isValid: false,
      error: '無効な画像データ形式です'
    };
  }

  // Base64データのサイズチェック
  const base64Size = (base64.length * 3) / 4; // おおよそのバイト数
  if (base64Size > LIMITS.IMAGE_SIZE_MAX) {
    const sizeMB = (base64Size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (LIMITS.IMAGE_SIZE_MAX / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `画像データが大きすぎます（約${sizeMB}MB / 最大${maxSizeMB}MB）`
    };
  }

  return { isValid: true };
};

// IDの検証（英数字とハイフンのみ）
export const validateId = (id: string, fieldName: string = 'ID'): ValidationResult => {
  const requiredCheck = validateRequired(id, fieldName);
  if (!requiredCheck.isValid) return requiredCheck;

  if (!/^[a-zA-Z0-9\-_]+$/.test(id)) {
    return {
      isValid: false,
      error: `${fieldName}は英数字、ハイフン、アンダースコアのみ使用できます`
    };
  }

  return { isValid: true };
};

// 日付文字列の検証
export const validateDateString = (dateStr: string, fieldName: string = '日付'): ValidationResult => {
  if (!dateStr || typeof dateStr !== 'string') {
    return {
      isValid: false,
      error: `${fieldName}が無効です`
    };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: `${fieldName}の形式が無効です`
    };
  }

  // 未来すぎる日付や過去すぎる日付をチェック
  const now = new Date();
  const minDate = new Date(2000, 0, 1); // 2000年1月1日
  const maxDate = new Date(now.getFullYear() + 10, 11, 31); // 10年後まで

  if (date < minDate || date > maxDate) {
    return {
      isValid: false,
      error: `${fieldName}が範囲外です（2000年〜${now.getFullYear() + 10}年）`
    };
  }

  return { isValid: true };
};