import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ETAHistoryChartProps {
  data: any[];
}

const ETAHistoryChart = ({ data }: ETAHistoryChartProps) => {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500">No history data available</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            tick={{ fontSize: 12 }} 
            tickMargin={10}
          />
          <YAxis 
            stroke="#94a3b8" 
            tick={{ fontSize: 12 }} 
            label={{ value: 'Delay (min)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line 
            type="monotone" 
            dataKey="predicted_delay" 
            name="Predicted Delay" 
            stroke="#6366f1" 
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line 
            type="monotone" 
            dataKey="actual_delay" 
            name="Actual Delay" 
            stroke="#10b981" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ETAHistoryChart;
