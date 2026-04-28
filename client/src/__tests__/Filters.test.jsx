import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Filters from '../components/Filters';

describe('Filters', () => {
  const defaultProps = {
    category: '',
    onCategoryChange: vi.fn(),
    sortOrder: 'date_desc',
    onSortChange: vi.fn(),
    total: 1500.5,
    count: 5,
  };

  it('renders category filter dropdown', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('renders sort by date dropdown', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByLabelText(/sort by date/i)).toBeInTheDocument();
    expect(screen.getByText('Newest First')).toBeInTheDocument();
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
  });

  it('displays expense count and total', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByText('5 expenses')).toBeInTheDocument();
    expect(screen.getByText('Total: ₹1500.50')).toBeInTheDocument();
  });

  it('shows singular "expense" for count = 1', () => {
    render(<Filters {...defaultProps} count={1} total={100} />);
    expect(screen.getByText('1 expense')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category is selected', () => {
    const onCategoryChange = vi.fn();
    render(<Filters {...defaultProps} onCategoryChange={onCategoryChange} />);
    fireEvent.change(screen.getByLabelText(/filter by category/i), { target: { value: 'Food' } });
    expect(onCategoryChange).toHaveBeenCalledWith('Food');
  });

  it('calls onSortChange when sort order is changed', () => {
    const onSortChange = vi.fn();
    render(<Filters {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.change(screen.getByLabelText(/sort by date/i), { target: { value: 'date_asc' } });
    expect(onSortChange).toHaveBeenCalledWith('date_asc');
  });

  it('shows Clear button when a category is selected', () => {
    render(<Filters {...defaultProps} category="Food" />);
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  it('does not show Clear button when no category is selected', () => {
    render(<Filters {...defaultProps} category="" />);
    expect(screen.queryByText(/clear/i)).not.toBeInTheDocument();
  });

  it('calls onCategoryChange with empty string when Clear is clicked', () => {
    const onCategoryChange = vi.fn();
    render(<Filters {...defaultProps} category="Food" onCategoryChange={onCategoryChange} />);
    fireEvent.click(screen.getByText(/clear/i));
    expect(onCategoryChange).toHaveBeenCalledWith('');
  });
});
