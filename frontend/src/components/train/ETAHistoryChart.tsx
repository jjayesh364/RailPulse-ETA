import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ETAHistoryChartProps {
  data: any[];
}

const ETAHistoryChart = ({ data }: ETAHistoryChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-400">
        No ETA history available
      </div>
    );
  }

  // Normalize the backend history data for the chart.
const chartData = data.map((item, index) => ({
  time: (() => {
    const rawTime =
      item.time ||
      item.timestamp ||
      item.created_at ||
      item.updated_at;

    if (!rawTime) return `Update ${index + 1}`;

    try {
      const date = new Date(rawTime);

      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      // Keep original value if parsing fails
    }

    return rawTime;
  })(),

  predicted_delay:
    item.predicted_delay ??
    item.predicted_delay_minutes ??
    item.predictedDelay ??
    item.delay_minutes ??
    0,

  actual_delay:
    item.actual_delay ??
    item.actual_delay_minutes ??
    item.actualDelay ??
    item.current_delay_minutes ??
    item.current_delay ??
    null,
}));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />

          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />

          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            }}
            labelStyle={{
              color: '#0f172a',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: '11px',
              paddingTop: '8px',
            }}
          />

          <Line
            type="monotone"
            dataKey="predicted_delay"
            name="Predicted Delay"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{
              r: 2.5,
              fill: '#6366f1',
              strokeWidth: 0,
            }}
            activeDot={{
              r: 4,
            }}
          />

          <Line
            type="monotone"
            dataKey="actual_delay"
            name="Actual Delay"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{
              r: 2,
              fill: '#10b981',
              strokeWidth: 0,
            }}
            activeDot={{
              r: 4,
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ETAHistoryChart;