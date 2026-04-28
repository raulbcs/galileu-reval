import { parseInput } from './priceCalc'

function sanitizeInput(raw) {
  return raw.replace(/\./g, ',')
}

function isValidNumber(raw) {
  return /^$|^\d+$|^\d+,?$|^\d+,\d{0,2}$/.test(raw)
}

export function SliderGroup({ label, value, display, min, max, step, onChange, enabled, onToggle }) {
  const isToggleable = onToggle !== undefined
  const isEnabled = isToggleable ? enabled : true

  return (
    <label className={'calc-slider-group' + (!isEnabled ? ' disabled' : '')}>
      <div className="calc-slider-head">
        <span className="calc-slider-label">
          {isToggleable && (
            <input
              type="checkbox"
              className="calc-toggle-check"
              checked={isEnabled}
              onChange={e => onToggle(e.target.checked)}
            />
          )}
          {label}
        </span>
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
        disabled={!isEnabled}
      />
    </label>
  )
}

export function LucroInput({ value, onChange, custo }) {
  const pct = custo > 0 ? (value / custo) * 100 : 0

  return (
    <div className="calc-input-group">
      <div className="calc-slider-head">
        <span>Lucro Desejado</span>
      </div>
      <div className="calc-lucro-fields">
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">%</span>
          <input
            type="text"
            inputMode="decimal"
            className="calc-input"
            value={pct ? pct.toFixed(1).replace('.', ',') : ''}
            placeholder="0"
            onChange={e => {
              const raw = sanitizeInput(e.target.value)
              if (!isValidNumber(raw)) return
              const v = parseInput(raw)
              onChange(custo * v / 100)
            }}
          />
        </div>
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="calc-input"
            value={value ? value.toFixed(2).replace('.', ',') : ''}
            placeholder="0,00"
            onChange={e => {
              const raw = sanitizeInput(e.target.value)
              if (!isValidNumber(raw)) return
              onChange(parseInput(raw))
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function ComissaoInput({ pct, rs, onPctChange, onRsChange, preco, enabled, onToggle }) {
  const isToggleable = onToggle !== undefined
  const isEnabled = isToggleable ? enabled : true

  return (
    <div className={'calc-input-group' + (!isEnabled ? ' disabled' : '')}>
      <div className="calc-slider-head">
        <span className="calc-slider-label">
          {isToggleable && (
            <input
              type="checkbox"
              className="calc-toggle-check"
              checked={isEnabled}
              onChange={e => onToggle(e.target.checked)}
            />
          )}
          Comissão
        </span>
      </div>
      <div className="calc-lucro-fields">
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">%</span>
          <input
            type="text"
            inputMode="decimal"
            className="calc-input"
            value={pct ? pct.toFixed(1).replace('.', ',') : ''}
            placeholder="0"
            onChange={e => {
              const raw = sanitizeInput(e.target.value)
              if (!isValidNumber(raw)) return
              onPctChange(parseInput(raw))
            }}
            disabled={!isEnabled}
          />
        </div>
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="calc-input"
            value={rs ? rs.toFixed(2).replace('.', ',') : ''}
            placeholder="0,00"
            onChange={e => {
              const raw = sanitizeInput(e.target.value)
              if (!isValidNumber(raw)) return
              onRsChange(parseInput(raw))
            }}
            disabled={!isEnabled}
          />
        </div>
      </div>
    </div>
  )
}

export function TaxaFixaInput({ value, onChange, enabled, onToggle, info }) {
  const isToggleable = onToggle !== undefined
  const isEnabled = isToggleable ? enabled : true

  return (
    <div className={'calc-input-group' + (!isEnabled ? ' disabled' : '')}>
      <div className="calc-slider-head">
        <span className="calc-slider-label">
          {isToggleable && (
            <input
              type="checkbox"
              className="calc-toggle-check"
              checked={isEnabled}
              onChange={e => onToggle(e.target.checked)}
            />
          )}
          Taxa Fixa
        </span>
      </div>
      <div className="calc-lucro-fields">
        <div className="calc-input-wrap">
          <span className="calc-input-prefix">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="calc-input"
            value={value ? value.toFixed(2).replace('.', ',') : ''}
            placeholder="0,00"
            onChange={e => {
              const raw = sanitizeInput(e.target.value)
              if (!isValidNumber(raw)) return
              onChange(parseInput(raw))
            }}
            disabled={!isEnabled}
          />
        </div>
      </div>
      {isEnabled && info}
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
