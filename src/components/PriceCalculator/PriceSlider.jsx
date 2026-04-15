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

export function LucroInput({ value, onChange }) {
  return (
    <div className="calc-input-group">
      <div className="calc-slider-head">
        <span>Lucro Desejado</span>
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">R$</span>
          <input
            type="number"
            className="calc-input"
            min="0"
            max="9999"
            step="0.5"
            value={value}
            onChange={e => onChange(Math.max(0, +e.target.value || 0))}
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
