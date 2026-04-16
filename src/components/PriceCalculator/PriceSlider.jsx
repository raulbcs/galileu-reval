export function SliderGroup({ label, value, display, min, max, step, onChange }) {
  return (
    <label className="calc-slider-group">
      <div className="calc-slider-head">
        <span>{label}</span>
        <span className="calc-val">{display}</span>
      </div>
      <input
        type="range"
        className="calc-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
      />
    </label>
  )
}

export function LucroInput({ value, onChange, custo }) {
  const pct = custo > 0 ? ((value / custo) * 100) : 0

  const handlePctChange = (raw) => {
    const v = raw === '' ? 0 : Math.max(0, +raw || 0)
    onChange(custo * v / 100)
  }

  const handleRsChange = (raw) => {
    onChange(raw === '' ? 0 : Math.max(0, +raw || 0))
  }

  return (
    <div className="calc-input-group">
      <div className="calc-slider-head">
        <span>Lucro Desejado</span>
      </div>
      <div className="calc-lucro-fields">
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">%</span>
          <input
            type="number"
            className="calc-input"
            min="0"
            step="0.1"
            value={pct ? pct : ''}
            placeholder="0"
            onChange={e => handlePctChange(e.target.value)}
          />
        </div>
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">R$</span>
          <input
            type="number"
            className="calc-input"
            min="0"
            step="0.1"
            value={value || ''}
            placeholder="0"
            onChange={e => handleRsChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export function Breakdown({ rows }) {
  return (
    <div className="calc-breakdown">
      {rows.map((r, i) => (
        <div key={i} className={'calc-bd-row' + (r.className ? ' ' + r.className : '')}>
          <span>{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
    </div>
  )
}
