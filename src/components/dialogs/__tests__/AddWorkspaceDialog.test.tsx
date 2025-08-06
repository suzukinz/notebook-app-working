import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWorkspaceDialog from '../AddWorkspaceDialog';

describe('AddWorkspaceDialog', () => {
  const mockOnAdd = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAdd: mockOnAdd,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<AddWorkspaceDialog {...defaultProps} />);

    expect(screen.getByText('新しいワークスペースを追加')).toBeInTheDocument();
    expect(screen.getByLabelText('ワークスペース名')).toBeInTheDocument();
    expect(screen.getByText('アイコン')).toBeInTheDocument();
    expect(screen.getByText('カラー')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<AddWorkspaceDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('新しいワークスペースを追加')).not.toBeInTheDocument();
  });

  it('should handle workspace name input', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'My Workspace');

    expect(nameInput).toHaveValue('My Workspace');
  });

  it('should show preview when name is entered', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'Test Workspace');

    await waitFor(() => {
      expect(screen.getByText('プレビュー:')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });
  });

  it('should handle icon selection', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const homeIcon = screen.getByText('🏠');
    await user.click(homeIcon);

    // Icon should be selected (has blue border)
    const iconButton = screen.getByRole('button', { name: /🏠/ });
    expect(iconButton).toHaveClass('border-blue-500');
  });

  it('should handle color selection', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    // Find a color button by testing a known color pattern
    const colorButton = screen.getByRole('button', { name: /color/i });
    await user.click(colorButton);
    
    // Verify the selection state
    await waitFor(() => {
      expect(colorButton).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should submit valid workspace data', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'New Workspace');

    const submitButton = screen.getByText('ワークスペースを作成');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'New Workspace',
        icon: '💼', // default icon
        color: 'blue' // default color
      });
    });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not submit with empty name', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const submitButton = screen.getByText('ワークスペースを作成');
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should show validation error for long names', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    const longName = 'a'.repeat(101); // Exceeds WORKSPACE_NAME_MAX (100)
    await user.type(nameInput, longName);

    const submitButton = screen.getByText('ワークスペースを作成');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
    });

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should clear validation error when typing', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    
    // First, trigger a validation error
    const longName = 'a'.repeat(101);
    await user.type(nameInput, longName);
    
    const submitButton = screen.getByText('ワークスペースを作成');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
    });

    // Now type valid input
    await user.clear(nameInput);
    await user.type(nameInput, 'Valid Name');

    await waitFor(() => {
      expect(screen.queryByText(/100文字以内で入力してください/)).not.toBeInTheDocument();
    });
  });

  it('should handle cancel button', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should handle escape key', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'Test');
    
    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle enter key submission', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'Test Workspace');
    
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'Test Workspace',
        icon: '💼',
        color: 'blue'
      });
    });
  });

  it('should sanitize workspace names', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    // Input with control characters that should be sanitized
    await user.type(nameInput, '  Test\x00Workspace\x0B  ');

    const submitButton = screen.getByText('ワークスペースを作成');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'TestWorkspace', // Sanitized: control chars removed, trimmed
        icon: '💼',
        color: 'blue'
      });
    });
  });

  it('should reset form when closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AddWorkspaceDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('ワークスペース名');
    await user.type(nameInput, 'Test Name');

    // Close dialog
    rerender(<AddWorkspaceDialog {...defaultProps} isOpen={false} />);
    
    // Reopen dialog
    rerender(<AddWorkspaceDialog {...defaultProps} isOpen={true} />);

    const newNameInput = screen.getByLabelText('ワークスペース名');
    expect(newNameInput).toHaveValue('');
  });
});