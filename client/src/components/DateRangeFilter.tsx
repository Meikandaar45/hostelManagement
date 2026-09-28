import { Input } from './Input';

interface DateRangeFilterProps {
  fromDate?: string;
  toDate?: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  fromLabel?: string;
  toLabel?: string;
}

export function DateRangeFilter({
  fromDate = '',
  toDate = '',
  onFromChange,
  onToChange,
  fromLabel = 'From Date',
  toLabel = 'To Date',
}: DateRangeFilterProps) {
  return (
    <>
      <Input
        label={fromLabel}
        type="date"
        value={fromDate}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <Input
        label={toLabel}
        type="date"
        value={toDate}
        onChange={(e) => onToChange(e.target.value)}
      />
    </>
  );
}
