import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DatePicker from '../components/DatePicker';

describe('DatePicker', () => {
  it('renders with a formatted date value', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    expect(screen.getByText(/28.*Apr.*2026/)).toBeInTheDocument();
  });

  it('shows placeholder when value is empty', () => {
    render(<DatePicker value="" onChange={vi.fn()} id="test-date" />);
    expect(screen.getByText('Select date')).toBeInTheDocument();
  });

  it('opens the calendar dropdown when clicked', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    expect(screen.getByText(/April/)).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows weekday headers', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Sa')).toBeInTheDocument();
  });

  it('navigates to previous month', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText(/March/)).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText(/May/)).toBeInTheDocument();
  });

  it('calls onChange with YYYY-MM-DD when a day is selected', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-04-28" onChange={onChange} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));

    // Find day 15 button by its text content
    const { container } = render(<div />); // just to get a reference
    const allCells = document.querySelectorAll('.datepicker-cell:not(.empty)');
    const btn15 = [...allCells].find((b) => b.textContent === '15');
    expect(btn15).toBeTruthy();
    fireEvent.click(btn15);
    expect(onChange).toHaveBeenCalledWith('2026-04-15');
  });

  it('closes the calendar when a day is selected', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-04-28" onChange={onChange} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));

    // Should be open
    expect(screen.getByText('Today')).toBeInTheDocument();

    const allCells = document.querySelectorAll('.datepicker-cell:not(.empty)');
    const btn10 = [...allCells].find((b) => b.textContent === '10');
    expect(btn10).toBeTruthy();
    fireEvent.click(btn10);

    // Calendar should close
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('handles year boundary (December → January)', () => {
    render(<DatePicker value="2026-12-15" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    expect(screen.getByText(/December/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText(/January/)).toBeInTheDocument();
    expect(screen.getByText(/2027/)).toBeInTheDocument();
  });

  it('handles year boundary (January → December)', () => {
    render(<DatePicker value="2026-01-15" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText(/December/)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('highlights the selected day', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    fireEvent.click(screen.getByLabelText('Pick a date'));
    const allCells = document.querySelectorAll('.datepicker-cell.selected');
    expect(allCells.length).toBe(1);
    expect(allCells[0].textContent).toBe('28');
  });

  it('renders the calendar emoji icon', () => {
    render(<DatePicker value="2026-04-28" onChange={vi.fn()} id="test-date" />);
    expect(screen.getByText('📅')).toBeInTheDocument();
  });
});
