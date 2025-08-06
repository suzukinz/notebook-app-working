import {
  validateStringLength,
  validateRequired,
  sanitizeString,
  sanitizeHtml,
  validateNoteTitle,
  validateNoteContent,
  validateWorkspaceName,
  validateTag,
  validateTags,
  validateImageFile,
  validateBase64Image,
  validateId,
  validateDateString,
  LIMITS
} from '../validation';

describe('Validation Utils', () => {
  describe('validateStringLength', () => {
    it('should validate string length correctly', () => {
      const result = validateStringLength('test', 10, 'Test Field');
      expect(result.isValid).toBe(true);
    });

    it('should fail for strings that are too long', () => {
      const result = validateStringLength('very long string', 5, 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5文字以内');
    });

    it('should fail for non-string values', () => {
      const result = validateStringLength(null as any, 10, 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文字列である必要があります');
    });
  });

  describe('validateRequired', () => {
    it('should pass for valid strings', () => {
      const result = validateRequired('test', 'Test Field');
      expect(result.isValid).toBe(true);
    });

    it('should fail for empty strings', () => {
      const result = validateRequired('', 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('必須項目');
    });

    it('should fail for null/undefined', () => {
      expect(validateRequired(null, 'Test Field').isValid).toBe(false);
      expect(validateRequired(undefined, 'Test Field').isValid).toBe(false);
    });

    it('should fail for whitespace-only strings', () => {
      const result = validateRequired('   ', 'Test Field');
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      const input = 'test\x00string\x0B';
      const result = sanitizeString(input);
      expect(result).toBe('teststring');
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const result = sanitizeString(input);
      expect(result).toBe('test string');
    });

    it('should handle non-string input', () => {
      const result = sanitizeString(null as any);
      expect(result).toBe('');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'line1\nline2\tindented';
      const result = sanitizeString(input);
      expect(result).toBe('line1\nline2\tindented');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove dangerous tags', () => {
      const input = '<div>safe</div><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<div>safe</div>');
      expect(result).not.toContain('<script>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(\'xss\')">test</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<div');
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript URLs', () => {
      const input = '<a href="javascript:alert(\'xss\')">link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="#"');
    });

    it('should handle non-string input', () => {
      const result = sanitizeHtml(null as any);
      expect(result).toBe('');
    });
  });

  describe('validateNoteTitle', () => {
    it('should validate valid note titles', () => {
      const result = validateNoteTitle('Valid Note Title');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Valid Note Title');
    });

    it('should fail for empty titles', () => {
      const result = validateNoteTitle('');
      expect(result.isValid).toBe(false);
    });

    it('should fail for titles that are too long', () => {
      const longTitle = 'a'.repeat(LIMITS.NOTE_TITLE_MAX + 1);
      const result = validateNoteTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(`${LIMITS.NOTE_TITLE_MAX}文字以内`);
    });

    it('should sanitize titles with control characters', () => {
      const result = validateNoteTitle('Title\x00with\x0Bcontrol');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Titlewithcontrol');
    });
  });

  describe('validateNoteContent', () => {
    it('should validate valid content', () => {
      const result = validateNoteContent('<div>Valid content</div>');
      expect(result.isValid).toBe(true);
    });

    it('should allow empty content', () => {
      const result = validateNoteContent('');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    it('should fail for content that is too long', () => {
      const longContent = 'a'.repeat(LIMITS.NOTE_CONTENT_MAX + 1);
      const result = validateNoteContent(longContent);
      expect(result.isValid).toBe(false);
    });

    it('should sanitize HTML content', () => {
      const result = validateNoteContent('<div>safe</div><script>alert("xss")</script>');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toContain('<div>safe</div>');
      expect(result.sanitized).not.toContain('<script>');
    });
  });

  describe('validateWorkspaceName', () => {
    it('should validate valid workspace names', () => {
      const result = validateWorkspaceName('My Workspace');
      expect(result.isValid).toBe(true);
    });

    it('should fail for names that are too long', () => {
      const longName = 'a'.repeat(LIMITS.WORKSPACE_NAME_MAX + 1);
      const result = validateWorkspaceName(longName);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTag', () => {
    it('should validate valid tags', () => {
      const result = validateTag('valid-tag_123');
      expect(result.isValid).toBe(true);
    });

    it('should fail for tags with invalid characters', () => {
      const result = validateTag('invalid@tag');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('英数字、ひらがな、カタカナ、漢字、ハイフン、アンダースコア');
    });

    it('should allow Japanese characters', () => {
      const result = validateTag('テストタグ');
      expect(result.isValid).toBe(true);
    });

    it('should allow Kanji characters', () => {
      const result = validateTag('重要');
      expect(result.isValid).toBe(true);
    });

    it('should fail for tags that are too long', () => {
      const longTag = 'a'.repeat(LIMITS.TAG_MAX + 1);
      const result = validateTag(longTag);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTags', () => {
    it('should validate valid tag arrays', () => {
      const result = validateTags(['tag1', 'tag2', 'テスト']);
      expect(result.isValid).toBe(true);
    });

    it('should fail for non-arrays', () => {
      const result = validateTags('not-an-array' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('配列である必要があります');
    });

    it('should fail for too many tags', () => {
      const tooManyTags = Array(LIMITS.TAG_COUNT_MAX + 1).fill('tag');
      const result = validateTags(tooManyTags);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(`${LIMITS.TAG_COUNT_MAX}個まで`);
    });

    it('should fail if any tag is invalid', () => {
      const result = validateTags(['valid', 'invalid@tag']);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateImageFile', () => {
    it('should validate valid image files', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(mockFile);
      expect(result.isValid).toBe(true);
    });

    it('should fail for files that are too large', () => {
      const largeData = new ArrayBuffer(LIMITS.IMAGE_SIZE_MAX + 1);
      const mockFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ファイルサイズが大きすぎます');
    });

    it('should fail for unsupported file types', () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('サポートされていないファイル形式');
    });

    it('should fail for dangerous file extensions', () => {
      const mockFile = new File(['test'], 'test.exe', { type: 'image/jpeg' });
      const result = validateImageFile(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('危険なファイル形式');
    });

    it('should fail for null file', () => {
      const result = validateImageFile(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ファイルが選択されていません');
    });
  });

  describe('validateBase64Image', () => {
    it('should validate valid base64 images', () => {
      const validBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD';
      const result = validateBase64Image(validBase64);
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid format', () => {
      const result = validateBase64Image('invalid-base64');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('無効な画像データ形式');
    });

    it('should fail for null/undefined', () => {
      expect(validateBase64Image(null as any).isValid).toBe(false);
      expect(validateBase64Image(undefined as any).isValid).toBe(false);
    });
  });

  describe('validateId', () => {
    it('should validate valid IDs', () => {
      const result = validateId('valid-id_123');
      expect(result.isValid).toBe(true);
    });

    it('should fail for IDs with invalid characters', () => {
      const result = validateId('invalid@id');
      expect(result.isValid).toBe(false);
    });

    it('should fail for empty IDs', () => {
      const result = validateId('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDateString', () => {
    it('should validate valid date strings', () => {
      const result = validateDateString('2023-12-25');
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid date formats', () => {
      const result = validateDateString('invalid-date');
      expect(result.isValid).toBe(false);
    });

    it('should fail for dates that are too old', () => {
      const result = validateDateString('1999-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('範囲外');
    });

    it('should fail for dates that are too far in the future', () => {
      const futureYear = new Date().getFullYear() + 20;
      const result = validateDateString(`${futureYear}-01-01`);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('範囲外');
    });

    it('should fail for null/undefined', () => {
      expect(validateDateString(null as any).isValid).toBe(false);
      expect(validateDateString(undefined as any).isValid).toBe(false);
    });
  });
});