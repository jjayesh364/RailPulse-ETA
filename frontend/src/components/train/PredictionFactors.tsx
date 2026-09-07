import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PredictionFactor } from '../../types';

interface PredictionFactorsProps {
  factors: PredictionFactor[];
}

const PredictionFactors = ({ factors }: PredictionFactorsProps) => {
  if (!factors || factors.length === 0) {
    return <div className="text-slate-500 text-sm p-4 text-center">No significant factors identified.</div>;
  }

  // Sort by impact
  const sorted = [...factors].sort((a, b) => Math.abs(b.impact_minutes) - Math.abs(a.impact_minutes));

  return (
    <div className="flex flex-col gap-4">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" />
            <YAxis dataKey="factor_name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              itemStyle={{ color: '#818cf8' }}
              formatter={(value: number) => [`${value > 0 ? '+' : ''}${value} min`, 'Impact']}
            />
            <Bar dataKey="impact_minutes" radius={[0, 4, 4, 0]}>
              {sorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.impact_minutes > 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 mt-2">
        {sorted.map((f, i) => (
          <div key={i} className="flex justify-between items-center bg-slate-700/30 p-2 rounded text-sm border border-slate-700/50">
            <span className="text-slate-300">{f.factor_name}</span>
            <span className={`font-bold ${f.impact_minutes > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {f.impact_minutes > 0 ? '+' : ''}{f.impact_minutes} min
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionFactors;
