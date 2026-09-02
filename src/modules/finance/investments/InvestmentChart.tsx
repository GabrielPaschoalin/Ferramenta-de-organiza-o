import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate, formatMoney } from '@/modules/finance/investments/helpers'

export type ChartPoint = {
  date: string
  value: number
  cost?: number
}

export function InvestmentChart({
  data,
  showCost,
}: {
  data: ChartPoint[]
  showCost?: boolean
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-xl bg-paper px-3 py-6 text-center text-sm text-muted">
        Sem dados de histórico ainda.
      </p>
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))
            }
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={44}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatMoney(value),
              name === 'cost' ? 'Custo' : 'Valor',
            ]}
            labelFormatter={(label: string) => formatDate(label)}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            name="value"
          />
          {showCost ? (
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="cost"
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
