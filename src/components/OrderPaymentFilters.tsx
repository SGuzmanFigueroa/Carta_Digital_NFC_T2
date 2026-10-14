import type { PaymentFilter } from '@/features/orders/paymentFilter';

const options: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Por Cobrar / En Consumo' },
  { value: 'paid', label: 'Cobradas / Finalizadas' },
];

export function OrderPaymentFilters({ value, counts, onChange }: {
  value: PaymentFilter;
  counts: Record<PaymentFilter, number>;
  onChange: (value: PaymentFilter) => void;
}) {
  return (
    <div role="group" aria-label="Filtrar comandas por estado de cuenta" className="flex flex-wrap items-center gap-2 mb-4">
      {options.map(option => (
        <button key={option.value} type="button" aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708] ${
            value === option.value ? 'border-[#ff5708] text-[#ff5708] bg-transparent' : 'border-transparent text-[#c6c5cf] bg-transparent hover:text-[#e5e1e4]'
          }`}>
          <span>{option.label}</span>
          <span className="text-[11px] font-label-code tabular-nums opacity-75">{counts[option.value]}</span>
        </button>
      ))}
    </div>
  );
}
