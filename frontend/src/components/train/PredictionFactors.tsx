import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PredictionFactor } from '../../types';

interface PredictionFactorsProps {
  factors: PredictionFactor[];
}

const PredictionFactors = ({ factors }: PredictionFactorsProps) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No significant factors identified.
      </div>
    );
  }

  // Sort by impact
  const sorted = [...factors].sort(
    (a, b) =>
      Math.abs(b.impact_minutes) - Math.abs(a.impact_minutes)
  );

  return (
    <div className="flex flex-col gap-4">

      {/* CHART */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{
              top: 5,
              right: 20,
              left: 40,
              bottom: 5,
            }}
          >
            <XAxis
              type="number"
              tick={{
                fill: '#94a3b8',
                fontSize: 10,
              }}
              axisLine={{
                stroke: '#e2e8f0',
              }}
              tickLine={false}
            />

            <YAxis
              dataKey="factor_name"
              type="category"
              width={100}
              tick={{
                fill: '#64748b',
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              }}
              labelStyle={{
                color: '#0f172a',
                fontWeight: 600,
              }}
              itemStyle={{
                color: '#dc2626',
              }}
              formatter={(value: number) => [
                `${value > 0 ? '+' : ''}${value} min`,
                'Impact',
              ]}
            />

            <Bar
              dataKey="impact_minutes"
              radius={[0, 4, 4, 0]}
            >
              {sorted.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.impact_minutes > 0
                      ? '#ef4444'
                      : '#10b981'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FACTOR LIST */}
      <div className="mt-2 space-y-2">
        {sorted.map((factor, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-white"
          >
            <span className="text-sm font-medium text-slate-700">
              {factor.factor_name}
            </span>

            <span
              className={`text-sm font-bold ${
                factor.impact_minutes > 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }`}
            >
              {factor.impact_minutes > 0 ? '+' : ''}
              {factor.impact_minutes} min
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default PredictionFactors;