import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

function formatCurrency(value) {
  return `R$ ${value.toFixed(2)}`
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { preco_novo, criado_em } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <strong>{formatCurrency(preco_novo)}</strong>
      <span>{new Date(criado_em).toLocaleDateString('pt-BR')}</span>
    </div>
  )
}

export function PriceHistoryChart({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="price-history-chart">
      <h3>Historico de precos</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="criado_em"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'var(--text)' }}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: 'var(--text)' }}
            stroke="var(--border)"
            width={80}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="preco_novo"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--accent)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
