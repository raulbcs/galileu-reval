import { useState, useCallback } from 'react'
import { calcPreco, breakdown, fmt, fmtFaixaML } from './priceCalc'
import { SliderGroup, LucroInput, Breakdown } from './PriceSlider'

const ML_MODES = [
  { key: 'classico', label: 'Clássico', comissao: 12, frete: 0 },
  { key: 'premium', label: 'Premium', comissao: 17, frete: 0 },
  { key: 'full', label: 'Full', comissao: 18, frete: 10 },
]

const ML_FAIXAS_TOOLTIP =
  'Faixas de Taxa Fixa ML:\n' +
  '• < R$12,50 → 50% do preço\n' +
  '• R$12,50 – R$29 → R$6,25\n' +
  '• R$29 – R$50 → R$6,50\n' +
  '• R$50 – R$79 → R$6,75\n' +
  '• ≥ R$79 → Isento'

const IMPOSTOS_TOOLTIP =
  'Simples Nacional – Anexo I (Papelarias):\n' +
  '• Até R$180 mil/ano → 4,00%\n' +
  '• R$180 – 360 mil → 7,30%\n' +
  '• R$360 – 720 mil → 9,50%\n' +
  '• R$720 mil – 1,8 mi → 10,70%\n' +
  '• R$1,8 – 3,6 mi → 14,30%\n' +
  '• R$3,6 – 4,8 mi → 19,00%\n\n' +
  'Inclui: ICMS, PIS, COFINS, IRPJ, CSLL\n' +
  'Pagos via DAS (guia única).'

const RECEBIMENTO_TOOLTIP =
  'Taxa de Recebimento (Marketplace):\n' +
  'Cartão de crédito: ~3,5%\n' +
  'Boleto: ~2,0%\n' +
  'Pix: ~1,5%\n\n' +
  'ML e Shopee repassam o custo\n' +
  'do gateway de pagamento ao vendedor.'

export function MLPriceCalculator({ custo }) {
  const [mlMode, setMlMode] = useState('classico')
  const [lucro, setLucro] = useState(15)
  const [taxaFixaAuto, setTaxaFixaAuto] = useState(true)
  const [taxaFixaManual, setTaxaFixaManual] = useState(0)
  const [comissao, setComissao] = useState(12)
  const [ads, setAds] = useState(5)
  const [impostos, setImpostos] = useState(4)
  const [recebimento, setRecebimento] = useState(3)
  const [frete, setFrete] = useState(0)

  const switchMode = useCallback((mode) => {
    const preset = ML_MODES.find(m => m.key === mode)
    if (preset) {
      setMlMode(mode)
      setComissao(preset.comissao)
      setFrete(preset.frete)
    }
  }, [])

  const precoSemTaxa = calcPreco(custo, lucro, 0, comissao, ads, impostos, recebimento, frete) || custo
  const faixa = fmtFaixaML(precoSemTaxa)
  const taxaEfetiva = taxaFixaAuto ? faixa.taxa : taxaFixaManual

  const preco = calcPreco(custo, lucro, taxaEfetiva, comissao, ads, impostos, recebimento, frete)
  const bd = breakdown(preco, comissao, ads, taxaEfetiva, impostos, recebimento, frete)
  const liquido = preco ? preco - custo - bd.descontos : 0

  return (
    <div className="calc-card">
      <div className="calc-card-head">
        <span>Mercado Livre</span>
        <a
          className="calc-card-link"
          href="https://www.mercadolivre.com.br/ajuda/quanto-custa-vender-um-produto_870"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          Ver taxas
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div className="calc-mode-tabs">
        {ML_MODES.map(m => (
          <button
            key={m.key}
            className={'calc-mode-tab' + (mlMode === m.key ? ' active' : '')}
            onClick={() => switchMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {preco ? (
        <>
          <div className="calc-price-sug">{fmt(preco)}</div>
          <div className="calc-sliders">
            <LucroInput value={lucro} onChange={setLucro} />
            <SliderGroup label="Comissão" value={comissao} display={comissao + '%'} min={0} max={25} step={0.5} onChange={setComissao} />
            <SliderGroup label="Ads" value={ads} display={ads + '%'} min={0} max={20} step={0.5} onChange={setAds} />
            <div className="calc-taxa-fixa-block">
              <SliderGroup
                label="Taxa Fixa"
                value={taxaEfetiva}
                display={fmt(taxaEfetiva)}
                min={0}
                max={20}
                step={0.25}
                onChange={v => { setTaxaFixaAuto(false); setTaxaFixaManual(v) }}
              />
              <div className="calc-taxa-info">
                <div className="calc-taxa-faixa-tooltip" data-tooltip={ML_FAIXAS_TOOLTIP}>
                  <span className="calc-taxa-faixa">{faixa.desc}</span>
                  <span className="calc-taxa-help">?</span>
                </div>
                {taxaFixaAuto ? (
                  <button className="calc-taxa-toggle" onClick={() => setTaxaFixaAuto(false)}>manual</button>
                ) : (
                  <button className="calc-taxa-toggle" onClick={() => setTaxaFixaAuto(true)}>automático</button>
                )}
              </div>
            </div>
            <SliderGroup label="Frete Absorvido" value={frete} display={fmt(frete)} min={0} max={30} step={0.5} onChange={setFrete} />
            <div className="calc-impostos-block">
              <SliderGroup
                label="Impostos"
                value={impostos}
                display={impostos + '%'}
                min={0}
                max={30}
                step={0.5}
                onChange={setImpostos}
              />
              <div className="calc-impostos-tooltip" data-tooltip={IMPOSTOS_TOOLTIP}>
                <span className="calc-impostos-label">Simples Nacional · Anexo I · Papelaria</span>
                <span className="calc-taxa-help">?</span>
              </div>
            </div>
            <div className="calc-impostos-block">
              <SliderGroup
                label="Taxa de Recebimento"
                value={recebimento}
                display={recebimento + '%'}
                min={0}
                max={10}
                step={0.5}
                onChange={setRecebimento}
              />
              <div className="calc-impostos-tooltip" data-tooltip={RECEBIMENTO_TOOLTIP}>
                <span className="calc-impostos-label">Gateway de pagamento</span>
                <span className="calc-taxa-help">?</span>
              </div>
            </div>
          </div>
          <Breakdown rows={[
            { label: `Comissão (${comissao}%)`, value: fmt(bd.comissaoVal) },
            { label: `Ads (${ads}%)`, value: fmt(bd.adsVal) },
            { label: 'Taxa Fixa', value: fmt(taxaEfetiva) },
            { label: 'Frete Absorvido', value: fmt(frete) },
            { label: `Impostos (${impostos}%)`, value: fmt(bd.impostosVal), className: 'calc-bd-impostos' },
            { label: `Recebimento (${recebimento}%)`, value: fmt(bd.recebimentoVal), className: 'calc-bd-impostos' },
            { label: 'Total Descontos', value: fmt(bd.descontos), className: 'calc-bd-total' },
            { label: 'Lucro Líquido', value: fmt(liquido), className: 'calc-bd-lucro' },
          ]} />
        </>
      ) : (
        <div className="calc-error">Soma das taxas &gt;= 100%</div>
      )}
    </div>
  )
}
