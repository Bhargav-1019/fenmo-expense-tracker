import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExpenseForm from '../components/ExpenseForm';

describe('ExpenseForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    submitting: false,
    editingExpense: null,
    onCancelEdit: vi.fn(),
  };

  it('renders the Add Expense heading', () => {
    render(<ExpenseForm {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /add expense/i })).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<ExpenseForm {...defaultProps} />);
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    render(<ExpenseForm {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: /add expense/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveAttribute('type', 'submit');
  });

  it('defaults category to Food', () => {
    render(<ExpenseForm {...defaultProps} />);
    const select = screen.getByLabelText(/category/i);
    expect(select.value).toBe('Food');
  });

  it('shows all category options', () => {
    render(<ExpenseForm {...defaultProps} />);
    const options = screen.getAllByRole('option', { name: /food|transport|entertainment|utilities|health|shopping|other/i });
    expect(options.length).toBe(7);
  });

  it('disables submit button when submitting', () => {
    render(<ExpenseForm {...defaultProps} submitting={true} />);
    const submitBtn = screen.getByRole('button', { name: /adding/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows Edit Expense heading when editingExpense is provided', () => {
    const expense = { id: '1', amount: 100, category: 'Transport', description: 'Taxi', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} />);
    expect(screen.getByRole('heading', { name: /edit expense/i })).toBeInTheDocument();
  });

  it('pre-fills form fields in edit mode', () => {
    const expense = { id: '1', amount: 100, category: 'Transport', description: 'Taxi', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} />);
    expect(screen.getByLabelText(/amount/i)).toHaveValue(100);
    expect(screen.getByLabelText(/category/i)).toHaveValue('Transport');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Taxi');
  });

  it('shows Cancel button in edit mode', () => {
    const expense = { id: '1', amount: 100, category: 'Food', description: '', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows Save Changes button in edit mode', () => {
    const expense = { id: '1', amount: 100, category: 'Food', description: '', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('calls onCancelEdit when Cancel is clicked', () => {
    const onCancelEdit = vi.fn();
    const expense = { id: '1', amount: 100, category: 'Food', description: '', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} onCancelEdit={onCancelEdit} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancelEdit).toHaveBeenCalledTimes(1);
  });

  it('does not show Cancel button in add mode', () => {
    render(<ExpenseForm {...defaultProps} />);
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is valid', () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<ExpenseForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test' } });

    const submitBtn = screen.getByRole('button', { name: /add expense/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [data, key, editId] = onSubmit.mock.calls[0];
    expect(data.amount).toBe(50);
    expect(data.description).toBe('Test');
    expect(data.category).toBe('Food');
    expect(editId).toBeNull();
    expect(key).toBeDefined();
  });

  it('passes edit ID when submitting in edit mode', () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const expense = { id: 'edit-123', amount: 100, category: 'Food', description: 'Old', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} onSubmit={onSubmit} editingExpense={expense} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [, , editId] = onSubmit.mock.calls[0];
    expect(editId).toBe('edit-123');
  });

  it('shows Saving... text when submitting in edit mode', () => {
    const expense = { id: '1', amount: 100, category: 'Food', description: '', date: '2026-04-28' };
    render(<ExpenseForm {...defaultProps} editingExpense={expense} submitting={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
