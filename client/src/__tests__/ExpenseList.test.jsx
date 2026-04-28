import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExpenseList from '../components/ExpenseList';

describe('ExpenseList', () => {
  const expenses = [
    { id: '1', date: '2026-04-28', category: 'Food', description: 'Lunch', amount: 250 },
    { id: '2', date: '2026-04-27', category: 'Transport', description: 'Taxi', amount: 150 },
  ];

  it('renders the expense table with correct headers', () => {
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays all expense descriptions', () => {
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
  });

  it('displays formatted amounts', () => {
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('₹150.00')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ExpenseList expenses={[]} loading={true} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no expenses', () => {
    render(<ExpenseList expenses={[]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/no expenses/i)).toBeInTheDocument();
  });

  it('renders edit and delete buttons for each expense', () => {
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const editButtons = screen.getAllByLabelText('Edit');
    const deleteButtons = screen.getAllByLabelText('Delete');
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('calls onEdit with the expense when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ExpenseList expenses={expenses} loading={false} onEdit={onEdit} onDelete={vi.fn()} />);
    const editButtons = screen.getAllByLabelText('Edit');
    editButtons[0].click();
    expect(onEdit).toHaveBeenCalledWith(expenses[0]);
  });

  it('calls onDelete with expense id when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByLabelText('Delete');
    deleteButtons[1].click();
    expect(onDelete).toHaveBeenCalledWith('2');
  });

  it('displays category badges', () => {
    render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    // Category badges in the table rows
    const foodBadges = screen.getAllByText('Food');
    const transportBadges = screen.getAllByText('Transport');
    expect(foodBadges.length).toBeGreaterThanOrEqual(1);
    expect(transportBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows em-dash for empty description', () => {
    const withEmptyDesc = [{ id: '3', date: '2026-04-28', category: 'Food', description: '', amount: 100 }];
    render(<ExpenseList expenses={withEmptyDesc} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders correct number of table rows', () => {
    const { container } = render(<ExpenseList expenses={expenses} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});
