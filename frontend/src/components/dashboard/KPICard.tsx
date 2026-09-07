import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
}

const KPICard = ({ title, value, icon: Icon, colorClass, subtext }: KPICardProps) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-md ${colorClass} bg-opacity-10`}>
          <Icon className={`w-4 h-4 ${colorClass.replace('bg-', 'text-').replace('text-opacity-10', '')}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
      </div>
    </div>
  );
};

export default KPICard;
