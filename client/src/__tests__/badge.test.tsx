import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge, PriorityBadge, RoleBadge } from '../components/Badge';

describe('Badge Components', () => {
  it('renders default Badge with custom text', () => {
    render(<Badge variant="success">Active Status</Badge>);
    expect(screen.getByText('Active Status')).toBeDefined();
  });

  it('renders RoleBadge for each role', () => {
    const { rerender } = render(<RoleBadge role="ADMIN" />);
    expect(screen.getByText('ADMIN')).toBeDefined();

    rerender(<RoleBadge role="WARDEN" />);
    expect(screen.getByText('WARDEN')).toBeDefined();

    rerender(<RoleBadge role="STUDENT" />);
    expect(screen.getByText('STUDENT')).toBeDefined();

    rerender(<RoleBadge role="MAINTENANCE" />);
    expect(screen.getByText('MAINTENANCE')).toBeDefined();
  });

  it('renders StatusBadge for active/inactive boolean', () => {
    const { rerender } = render(<StatusBadge active={true} />);
    expect(screen.getByText('Active')).toBeDefined();

    rerender(<StatusBadge active={false} />);
    expect(screen.getByText('Inactive')).toBeDefined();
  });

  it('renders StatusBadge for workflow statuses', () => {
    const { rerender } = render(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText('Resolved')).toBeDefined();

    rerender(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeDefined();

    rerender(<StatusBadge status="PARTIALLY_OCCUPIED" />);
    expect(screen.getByText('Partially Occupied')).toBeDefined();
  });

  it('renders PriorityBadge correctly', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('URGENT')).toBeDefined();
  });
});
