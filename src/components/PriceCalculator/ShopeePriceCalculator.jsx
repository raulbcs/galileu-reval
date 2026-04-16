import { useState } from 'react'
import { calcPreco, breakdown, fmt, shopeeSubsidio } from './priceCalc'
import { SliderGroup, LucroInput, Breakdown } from './PriceSlider'

const IMPOSTOS = 7.3

const RECEBIMENTO_TOOLTIP =
  'Taxa de Recebimento (Marketplace):\n' +
  'Cartão de crédito: ~3,5%\n' +
  'Boleto: ~2,0%\n' +
  'Pix: ~1,5%\n\n' +
  'ML e Shopee repassam o custo\n' +
  'do gateway de pagamento ao vendedor.'

export function ShopeePriceCalculator({ custo }) {
  const [lucro, setLucro] = useState(15)
  const [comissao, setComissao] = useState(10)
  const [ads, setAds] = useState(0)
  const [taxaFixa, setTaxaFixa] = useState(0)
  const [recebimento, setRecebimento] = useState(3)
  const [frete, setFrete] = useState(6)

  const preco = calcPreco(custo, lucro, taxaFixa, comissao, ads, IMPOSTOS, recebimento, frete)
  const bd = breakdown(preco, comissao, ads, taxaFixa, IMPOSTOS, recebimento, frete)
  const liquido = preco ? preco - custo - bd.descontos : 0
  const subsidio = preco ? shopeeSubsidio(preco) : 0

  return (
    <div className="calc-card">
      <div className="calc-card-head">
        <span>Shopee</span>
        <a
          className="calc-card-link"
          href="https://seller.br.shopee.cn/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          Ver taxas
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div className="calc-mode-tabs calc-mode-tabs-empty" />
      {preco ? (
        <>
          <div className="calc-price-sug">{fmt(preco)}</div>
          <div className="calc-sliders">
            <LucroInput value={lucro} onChange={setLucro} custo={custo} />
            <SliderGroup label="Comissão" value={comissao} display={`${comissao}% · ${fmt(bd.comissaoVal)}`} min={0} max={25} step={0.1} onChange={setComissao} />
            <SliderGroup label="Ads" value={ads} display={`${ads}% · ${fmt(bd.adsVal)}`} min={0} max={20} step={0.1} onChange={setAds} />
            <SliderGroup label="Taxa Fixa" value={taxaFixa} display={fmt(taxaFixa)} min={0} max={20} step={0.1} onChange={setTaxaFixa} />
            <div className="calc-frete-block">
              <SliderGroup label="Frete Absorvido" value={frete} display={fmt(frete)} min={0} max={30} step={0.1} onChange={setFrete} />
              <div className="calc-frete-info">
                Shopee cobre até {fmt(subsidio)} de frete
              </div>
            </div>
            <div className="calc-impostos-block">
              <SliderGroup
                label="Taxa de Recebimento"
                value={recebimento}
                display={`${recebimento}% · ${fmt(bd.recebimentoVal)}`}
                min={0}
                max={10}
                step={0.1}
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
            { label: 'Taxa Fixa', value: fmt(taxaFixa) },
            { label: 'Frete Absorvido', value: fmt(frete) },
            { label: `Impostos (${IMPOSTOS}%)`, value: fmt(bd.impostosVal), className: 'calc-bd-impostos' },
            { label: `Recebimento (${recebimento}%)`, value: fmt(bd.recebimentoVal), className: 'calc-bd-impostos' },
            { label: 'Total Descontos', value: fmt(bd.descontos), className: 'calc-bd-total' },
            { label: 'Lucro Líquido', value: fmt(liquido), className: 'calc-bd-lucro' },
          ]} />
          <div className="calc-price-bottom">
            <span>Preço Final</span>
            <span className="calc-price-bottom-val">{fmt(preco)}</span>
          </div>
        </>
      ) : (
        <div className="calc-error">Soma das taxas &gt;= 100%</div>
      )}
    </div>
  )
}
