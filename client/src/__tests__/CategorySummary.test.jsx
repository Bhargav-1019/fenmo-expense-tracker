import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CategorySummary from '../components/CategorySummary';

describe('CategorySummary', () => {
  const expenses = [
    { id: '1', amount: 500, category: 'Food' },
    { id: '2', amount: 200, category: 'Food' },
    { id: '3', amount: 300, category: 'Transport' },
    { id: '4', amount: 100, category: 'Health' },
  ];

  it('renders nothing when expenses is empty', () => {
    const { container } = render(<CategorySummary expenses={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the Category Breakdown heading', () => {
    render(<CategorySummary expenses={expenses} />);
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
  });

  it('displays all categories in the legend', () => {
    render(<CategorySummary expenses={expenses} />);
    const legendLabels = document.querySelectorAll('.legend-label');
    const labels = [...legendLabels].map((el) => el.textContent);
    expect(labels).toContain('Food');
    expect(labels).toContain('Transport');
    expect(labels).toContain('Health');
  });

  it('shows correct percentages in legend', () => {
    // Food: 700/1100 = 63.6%, Transport: 300/1100 = 27.3%, Health: 100/1100 = 9.1%
    render(<CategorySummary expenses={expenses} />);
    const pctElements = document.querySelectorAll('.legend-pct');
    const pcts = [...pctElements].map((el) => el.textContent.trim());
    expect(pcts).toContain('63.6%');
    expect(pcts).toContain('27.3%');
    expect(pcts).toContain('9.1%');
  });

  it('defaults center to highest-spend category (Food)', () => {
    render(<CategorySummary expenses={expenses} />);
    const centerCategory = document.querySelector('.donut-center-category');
    expect(centerCategory.textContent).toBe('Food');
    expect(screen.getByText('₹700.00')).toBeInTheDocument();
  });

  it('updates center when a legend item is clicked', () => {
    render(<CategorySummary expenses={expenses} />);
    // Click Transport legend
    const legendLabels = document.querySelectorAll('.legend-label');
    const transportLabel = [...legendLabels].find((el) => el.textContent === 'Transport');
    const transportBtn = transportLabel.closest('button');
    fireEvent.click(transportBtn);

    const centerCategory = document.querySelector('.donut-center-category');
    expect(centerCategory.textContent).toBe('Transport');
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
  });

  it('highlights the active legend item', () => {
    render(<CategorySummary expenses={expenses} />);
    const legendLabels = document.querySelectorAll('.legend-label');
    const healthLabel = [...legendLabels].find((el) => el.textContent === 'Health');
    const healthBtn = healthLabel.closest('button');
    fireEvent.click(healthBtn);

    expect(healthBtn.classList.contains('legend-active')).toBe(true);
  });

  it('renders an SVG with the donut chart', () => {
    render(<CategorySummary expenses={expenses} />);
    const svg = document.querySelector('.donut-svg');
    expect(svg).toBeTruthy();
    // Should have 3 path segments (Food, Transport, Health)
    const paths = svg.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('handles single category (full ring)', () => {
    const single = [{ id: '1', amount: 100, category: 'Food' }];
    render(<CategorySummary expenses={single} />);
    const centerCategory = document.querySelector('.donut-center-category');
    expect(centerCategory.textContent).toBe('Food');
    const pctElements = document.querySelectorAll('.legend-pct');
    expect(pctElements[0].textContent.trim()).toBe('100.0%');
  });

  it('sorts categories by amount (highest first)', () => {
    render(<CategorySummary expenses={expenses} />);
    const legendLabels = document.querySelectorAll('.legend-label');
    const labels = [...legendLabels].map((el) => el.textContent);
    expect(labels[0]).toBe('Food');        // 700
    expect(labels[1]).toBe('Transport');   // 300
    expect(labels[2]).toBe('Health');      // 100
  });

  it('selected segment has scale transform', () => {
    render(<CategorySummary expenses={expenses} />);
    const paths = document.querySelectorAll('.donut-svg path');
    // First path (Food) should be selected by default and have scale(1.05)
    const firstPath = paths[0];
    expect(firstPath.style.transform).toBe('scale(1.05)');
  });

  it('shows center percentage', () => {
    render(<CategorySummary expenses={expenses} />);
    const centerPct = document.querySelector('.donut-center-percent');
    expect(centerPct.textContent.trim()).toBe('63.6%');
  });
});
