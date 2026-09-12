import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
}

const KPICard = ({
  title,
  value,
  icon: Icon,
  colorClass,
}: KPICardProps) => {
  const textColor = colorClass.split(' ').find((c) => c.startsWith('text-')) || 'text-slate-700';
  const bgColor = colorClass.split(' ').find((c) => c.startsWith('bg-')) || 'bg-slate-500';

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
        </div>

        {/* Icon */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 ${textColor}`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div className="mt-5">
        <p className={`text-3xl font-bold tracking-tight ${textColor}`}>
          {value}
        </p>
      </div>

      {/* Bottom indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full w-1/3 rounded-full ${bgColor}`}
          />
        </div>
      </div>

      {/* Subtle accent */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] w-0 ${bgColor} transition-all duration-200 group-hover:w-full`}
      />
    </div>
  );
};

export default KPICard;