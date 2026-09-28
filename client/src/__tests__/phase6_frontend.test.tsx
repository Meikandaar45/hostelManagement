import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Card } from '../components/Card';
import { Pagination } from '../components/Pagination';

describe('Phase 6 - Frontend Components & UX Accessibility Testing', () => {
  // =========================================================================
  // 1. LOADING STATES
  // =========================================================================
  describe('Loading States', () => {
    it('renders loading spinner and text in Table when loading is true', () => {
      render(
        <Table
          data={[]}
          columns={[{ header: 'Name', accessor: (r: any) => r.name }]}
          keyExtractor={(r: any) => r.id}
          loading={true}
        />
      );

      expect(screen.getByText('Loading data...')).toBeDefined();
    });
  });

  // =========================================================================
  // 2. EMPTY STATES
  // =========================================================================
  describe('Empty States', () => {
    it('renders empty state when data array is empty', () => {
      render(
        <Table
          data={[]}
          columns={[{ header: 'Title', accessor: (r: any) => r.title }]}
          keyExtractor={(r: any) => r.id}
          loading={false}
          emptyMessage="No complaints recorded yet"
        />
      );

      expect(screen.getByText('No Data')).toBeDefined();
      expect(screen.getByText('No complaints recorded yet')).toBeDefined();
    });
  });

  // =========================================================================
  // 3. FORM INPUT VALIDATION & ERROR STATES
  // =========================================================================
  describe('Form Inputs & Error Validation', () => {
    it('renders Input with error message and accessible alert role', () => {
      render(
        <Input
          id="student-email"
          label="Email Address"
          placeholder="student@hostel.com"
          error="Invalid email format"
        />
      );

      const input = screen.getByPlaceholderText('student@hostel.com');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('student-email-error');

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg.textContent).toBe('Invalid email format');
    });

    it('renders Select with error state and aria attributes', () => {
      render(
        <Select
          id="room-type-select"
          label="Room Type"
          error="Room type is required"
          options={[
            { value: 'SINGLE', label: 'Single' },
            { value: 'DOUBLE', label: 'Double' },
          ]}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select.getAttribute('aria-invalid')).toBe('true');
      expect(select.getAttribute('aria-describedby')).toBe('room-type-select-error');

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg.textContent).toBe('Room type is required');
    });
  });

  // =========================================================================
  // 4. DIALOGS & ACCESSIBLE MODALS
  // =========================================================================
  describe('Modal Dialogs', () => {
    it('renders accessible dialog with title, aria-modal, and close action', () => {
      const handleClose = vi.fn();

      render(
        <Modal open={true} onClose={handleClose} title="Allocate Room">
          <p>Modal Body Content</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(screen.getByText('Allocate Room')).toBeDefined();
      expect(screen.getByText('Modal Body Content')).toBeDefined();

      const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes modal when Escape key is pressed', () => {
      const handleClose = vi.fn();

      render(
        <Modal open={true} onClose={handleClose} title="Confirm Action">
          <p>Dialog text</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders null when open is false', () => {
      const { container } = render(
        <Modal open={false} onClose={vi.fn()} title="Hidden Modal">
          <p>Hidden Content</p>
        </Modal>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // 5. KEYBOARD ACCESSIBILITY & INTERACTIVE CARDS
  // =========================================================================
  describe('Keyboard Navigation & Interactive Cards', () => {
    it('activates clickable Card on Enter and Space key presses', () => {
      const handleClick = vi.fn();

      render(
        <Card onClick={handleClick}>
          <h3>Interactive Card</h3>
        </Card>
      );

      const cardBtn = screen.getByRole('button');
      expect(cardBtn.getAttribute('tabIndex')).toBe('0');

      // Test Enter key
      fireEvent.keyDown(cardBtn, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(cardBtn, { key: ' ', code: 'Space' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 6. PAGINATION NAVIGATION
  // =========================================================================
  describe('Pagination Semantics', () => {
    it('renders accessible pagination navigation with previous/next triggers', () => {
      const handlePageChange = vi.fn();

      render(
        <Pagination
          page={2}
          totalPages={5}
          total={50}
          limit={10}
          onPageChange={handlePageChange}
        />
      );

      expect(screen.getByRole('navigation', { name: 'Pagination Navigation' })).toBeDefined();

      const prevBtn = screen.getByRole('button', { name: 'Previous page' });
      const nextBtn = screen.getByRole('button', { name: 'Next page' });

      fireEvent.click(prevBtn);
      expect(handlePageChange).toHaveBeenCalledWith(1);

      fireEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(3);
    });
  });
});
