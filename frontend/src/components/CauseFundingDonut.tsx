import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

type Datum = { name: string; value: number };

export function CauseFundingDonut({
  raisedEth,
  goalEth,
  isLightMode,
  className,
  compact,
  mini,
}: {
  raisedEth: number;
  goalEth: number;
  isLightMode: boolean;
  className?: string;
  /** Smaller radii for cards vs detail page */
  compact?: boolean;
  /** Tightest size for Causes list cards */
  mini?: boolean;
}) {
  const goal = Math.max(goalEth, 1e-9);
  const raised = Math.max(0, raisedEth);
  const cappedRaised = Math.min(raised, goal);
  const remaining = Math.max(0, goal - raised);
  const data: Datum[] =
    remaining <= 0 && cappedRaised > 0
      ? [{ name: 'Raised (goal met)', value: cappedRaised }]
      : [
          { name: 'Raised', value: cappedRaised },
          { name: 'Remaining to goal', value: remaining },
        ];

  const raisedFill = isLightMode ? '#059669' : '#22c55e';
  const remainFill = isLightMode ? '#cbd5e1' : 'rgba(51, 65, 85, 0.55)';
  const metFill = isLightMode ? '#0d9488' : '#14b8a6';

  const innerR = mini ? 24 : compact ? 32 : 44;
  const outerR = mini ? 36 : compact ? 48 : 62;
  const h = mini ? 84 : compact ? 120 : 168;

  return (
    <div className={className} style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerR}
            outerRadius={outerR}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={data.length === 1 ? metFill : entry.name === 'Raised' ? raisedFill : remainFill}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
