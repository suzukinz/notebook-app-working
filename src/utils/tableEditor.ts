// Markdown専用テーブル編集ユーティリティ

export interface TableCell {
  content: string;
  alignment: 'left' | 'center' | 'right';
}

export interface TableRow {
  cells: TableCell[];
}

export interface MarkdownTable {
  headers: TableCell[];
  rows: TableRow[];
}

export class MarkdownTableEditor {
  // Markdownテーブルを解析してオブジェクトに変換
  static parseMarkdownTable(markdownText: string): MarkdownTable | null {
    try {
      if (!markdownText || typeof markdownText !== 'string') return null;
      
      const lines = markdownText.trim().split('\n').map(line => line.trim());
      
      if (lines.length < 2) return null;

    // ヘッダー行を解析
    const headerLine = lines[0];
    if (!headerLine || !headerLine.startsWith('|') || !headerLine.endsWith('|')) return null;
    
    const headerCells = this.parseTableRow(headerLine);
    
    // セパレーター行を解析してアライメントを取得
    const separatorLine = lines[1];
    if (!separatorLine || !separatorLine.startsWith('|') || !separatorLine.endsWith('|')) return null;
    
    const alignments = this.parseAlignments(separatorLine);
    if (alignments.length !== headerCells.length) return null;

    // ヘッダーにアライメント情報を追加
    const headers: TableCell[] = headerCells.map((content, index) => ({
      content,
      alignment: alignments[index] || 'left'
    }));

    // データ行を解析
    const rows: TableRow[] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.startsWith('|') || !line.endsWith('|')) continue;
      
      const cellContents = this.parseTableRow(line);
      if (cellContents.length !== headerCells.length) continue;
      
      const cells: TableCell[] = cellContents.map((content, index) => ({
        content,
        alignment: alignments[index] || 'left'
      }));
      
      rows.push({ cells });
    }

    return { headers, rows };
    } catch (error) {
      console.warn('Failed to parse markdown table:', error);
      return null;
    }
  }

  // テーブルオブジェクトをMarkdown形式に変換
  static tableToMarkdown(table: MarkdownTable): string {
    if (table.headers.length === 0) return '';

    const lines: string[] = [];
    
    // ヘッダー行
    const headerLine = '| ' + table.headers.map(header => header.content).join(' | ') + ' |';
    lines.push(headerLine);
    
    // セパレーター行
    const separatorCells = table.headers.map(header => {
      switch (header.alignment) {
        case 'left':
          return ':---';
        case 'center':
          return ':---:';
        case 'right':
          return '---:';
        default:
          return '---';
      }
    });
    const separatorLine = '| ' + separatorCells.join(' | ') + ' |';
    lines.push(separatorLine);
    
    // データ行
    table.rows.forEach(row => {
      const rowLine = '| ' + row.cells.map(cell => cell.content).join(' | ') + ' |';
      lines.push(rowLine);
    });
    
    return lines.join('\n');
  }

  // 新しい空のテーブルを作成
  static createEmptyTable(rows: number = 3, cols: number = 3): MarkdownTable {
    const headers: TableCell[] = Array.from({ length: cols }, (_, i) => ({
      content: `ヘッダー${i + 1}`,
      alignment: 'left' as const
    }));

    const tableRows: TableRow[] = Array.from({ length: rows }, () => ({
      cells: Array.from({ length: cols }, () => ({
        content: '',
        alignment: 'left' as const
      }))
    }));

    return { headers, rows: tableRows };
  }

  // 列を追加
  static addColumn(table: MarkdownTable, index?: number): MarkdownTable {
    const insertIndex = index !== undefined ? index : table.headers.length;
    
    // ヘッダーに新しい列を追加
    const newHeaders = [...table.headers];
    newHeaders.splice(insertIndex, 0, {
      content: `新しい列`,
      alignment: 'left'
    });

    // 各行に新しいセルを追加
    const newRows = table.rows.map(row => ({
      cells: [...row.cells.slice(0, insertIndex), {
        content: '',
        alignment: 'left' as const
      }, ...row.cells.slice(insertIndex)]
    }));

    return { headers: newHeaders, rows: newRows };
  }

  // 列を削除
  static removeColumn(table: MarkdownTable, index: number): MarkdownTable {
    if (table.headers.length <= 1 || index < 0 || index >= table.headers.length) {
      return table; // 最後の列は削除できない
    }

    const newHeaders = table.headers.filter((_, i) => i !== index);
    const newRows = table.rows.map(row => ({
      cells: row.cells.filter((_, i) => i !== index)
    }));

    return { headers: newHeaders, rows: newRows };
  }

  // 行を追加
  static addRow(table: MarkdownTable, index?: number): MarkdownTable {
    const insertIndex = index !== undefined ? index : table.rows.length;
    
    const newRow: TableRow = {
      cells: table.headers.map(header => ({
        content: '',
        alignment: header.alignment
      }))
    };

    const newRows = [...table.rows];
    newRows.splice(insertIndex, 0, newRow);

    return { ...table, rows: newRows };
  }

  // 行を削除
  static removeRow(table: MarkdownTable, index: number): MarkdownTable {
    if (table.rows.length <= 1 || index < 0 || index >= table.rows.length) {
      return table; // 最後の行は削除できない
    }

    const newRows = table.rows.filter((_, i) => i !== index);
    return { ...table, rows: newRows };
  }

  // セルの内容を更新
  static updateCell(table: MarkdownTable, rowIndex: number, colIndex: number, content: string): MarkdownTable {
    if (rowIndex === -1) {
      // ヘッダーの更新
      if (colIndex < 0 || colIndex >= table.headers.length) return table;
      const newHeaders = [...table.headers];
      const currentHeader = newHeaders[colIndex];
      if (currentHeader) {
        newHeaders[colIndex] = { ...currentHeader, content };
      }
      return { ...table, headers: newHeaders };
    } else {
      // データ行の更新
      const currentRow = table.rows[rowIndex];
      if (!currentRow || rowIndex < 0 || rowIndex >= table.rows.length || colIndex < 0 || colIndex >= currentRow.cells.length) {
        return table;
      }
      const newRows = [...table.rows];
      const targetRow = newRows[rowIndex];
      if (targetRow) {
        newRows[rowIndex] = {
          ...targetRow,
          cells: [...targetRow.cells]
        };
        const targetCell = newRows[rowIndex]!.cells[colIndex];
        if (targetCell) {
          newRows[rowIndex]!.cells[colIndex] = {
            ...targetCell,
            content
          };
        }
      }
      return { ...table, rows: newRows };
    }
  }

  // 列のアライメントを変更
  static updateColumnAlignment(table: MarkdownTable, colIndex: number, alignment: 'left' | 'center' | 'right'): MarkdownTable {
    if (colIndex < 0 || colIndex >= table.headers.length) return table;

    // ヘッダーのアライメントを更新
    const newHeaders = [...table.headers];
    const currentHeader = newHeaders[colIndex];
    if (currentHeader) {
      newHeaders[colIndex] = { ...currentHeader, alignment };
    }

    // 全ての行の該当列のアライメントを更新
    const newRows = table.rows.map(row => ({
      ...row,
      cells: row.cells.map((cell, index) => 
        index === colIndex ? { ...cell, alignment } : cell
      )
    }));

    return { headers: newHeaders, rows: newRows };
  }

  // テーブルが妥当かチェック
  static validateTable(table: MarkdownTable): boolean {
    if (table.headers.length === 0) return false;
    
    // 全ての行が同じ列数を持っているかチェック
    const expectedCols = table.headers.length;
    return table.rows.every(row => row.cells.length === expectedCols);
  }

  // プライベートメソッド：テーブル行を解析
  private static parseTableRow(line: string): string[] {
    // 最初と最後の | を除去してセルに分割
    const withoutPipes = line.slice(1, -1);
    return withoutPipes.split('|').map(cell => cell.trim());
  }

  // プライベートメソッド：セパレーター行からアライメントを解析
  private static parseAlignments(separatorLine: string): Array<'left' | 'center' | 'right'> {
    const cells = this.parseTableRow(separatorLine);
    return cells.map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
        return 'center';
      } else if (trimmed.endsWith(':')) {
        return 'right';
      } else {
        return 'left';
      }
    });
  }

  // カーソル位置からテーブルを検出
  static detectTableAtCursor(text: string, cursorPosition: number): { table: MarkdownTable; start: number; end: number } | null {
    const lines = text.split('\n');
    let currentPos = 0;
    let tableStart = -1;
    let tableEnd = -1;
    let tableLines: string[] = [];

    // カーソル位置がある行を見つける
    for (let i = 0; i < lines.length; i++) {
      const lineStart = currentPos;
      const lineEnd = currentPos + (lines[i]?.length || 0);
      
      if (cursorPosition >= lineStart && cursorPosition <= lineEnd + 1) { // +1 for newline
        // この行がテーブルの一部かチェック
        const currentLine = lines[i];
        if (currentLine && this.isTableLine(currentLine)) {
          // 前後の行も含めてテーブル全体を取得
          tableStart = i;
          tableEnd = i;
          
          // 前の行を遡ってテーブルの開始を見つける
          while (tableStart > 0) {
            const prevLine = lines[tableStart - 1];
            if (prevLine && this.isTableLine(prevLine)) {
              tableStart--;
            } else {
              break;
            }
          }
          
          // 後の行を進んでテーブルの終了を見つける
          while (tableEnd < lines.length - 1) {
            const nextLine = lines[tableEnd + 1];
            if (nextLine && this.isTableLine(nextLine)) {
              tableEnd++;
            } else {
              break;
            }
          }
          
          tableLines = lines.slice(tableStart, tableEnd + 1);
          break;
        }
      }
      
      currentPos = lineEnd + 1; // +1 for newline
    }

    if (tableLines.length === 0) return null;

    const table = this.parseMarkdownTable(tableLines.join('\n'));
    if (!table) return null;

    // テーブルの開始・終了位置を計算
    let start = 0;
    for (let i = 0; i < tableStart; i++) {
      start += (lines[i]?.length || 0) + 1; // +1 for newline
    }

    let end = start;
    for (let i = tableStart; i <= tableEnd; i++) {
      end += (lines[i]?.length || 0) + 1; // +1 for newline
    }
    end--; // 最後の改行は含めない

    return { table, start, end };
  }

  // 行がテーブルの一部かどうかを判定
  private static isTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
  }
}