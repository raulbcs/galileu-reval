import './PriceCalculator.css'
import { MLPriceCalculator } from './MLPriceCalculator'
import { ShopeePriceCalculator } from './ShopeePriceCalculator'

export function PriceCalculator({ custo }) {
  return (
    <div className="calc-section">
      <h3>Simulador de Preços</h3>
      <div className="calc-custo">
        <span className="calc-label">Custo do Produto</span>
        <span className="calc-readonly">R$ {custo.toFixed(2)}</span>
      </div>
      <div className="calc-cards">
        <MLPriceCalculator custo={custo} />
        <ShopeePriceCalculator custo={custo} />
      </div>
    </div>
  )
}
