import { useState } from 'react'
import { MLPriceCalculator } from '../components/PriceCalculator/MLPriceCalculator'
import { ShopeePriceCalculator } from '../components/PriceCalculator/ShopeePriceCalculator'

import '../components/PriceCalculator/PriceCalculator.css'

const MARKETPLACES = [
  { key: 'ml', label: 'Mercado Livre' },
  { key: 'shopee', label: 'Shopee' },
]

export function SimuladorPage() {
  const [custo, setCusto] = useState('50')
  const [marketplace, setMarketplace] = useState('ml')
  const [resetKey, setResetKey] = useState(0)

  const custoNum = parseFloat(custo) || 0

  function handleCustoChange(e) {
    const v = e.target.value
    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setCusto(v)
  }

  function handleReset() {
    setCusto('50')
    setResetKey(k => k + 1)
  }

  return (
    <div className="page simulador-page">
      <h2 className="simulador-title">Simulador de Preço</h2>

      <div className="simulador-controls">
        <div className="simulador-custo">
          <label className="simulador-custo-label">Custo do Produto</label>
          <div className="simulador-custo-input">
            <span className="simulador-custo-prefix">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={custo}
              onChange={handleCustoChange}
              placeholder="0,00"
              autoFocus
            />
          </div>
        </div>
        <button className="simulador-reset" onClick={handleReset}>Resetar</button>
      </div>

      <div className="simulador-mp-selector">
        {MARKETPLACES.map(mp => (
          <button
            key={mp.key}
            className={'simulador-mp-btn' + (marketplace === mp.key ? ' active' : '')}
            onClick={() => setMarketplace(mp.key)}
          >
            {mp.label}
          </button>
        ))}
      </div>

      <div className="simulador-card-wrap">
        {marketplace === 'ml' && <MLPriceCalculator key={resetKey} custo={custoNum} />}
        {marketplace === 'shopee' && <ShopeePriceCalculator key={resetKey} custo={custoNum} />}
      </div>
    </div>
  )
}
