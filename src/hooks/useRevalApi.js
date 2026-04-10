import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import {
  getCategorias,
  getFornecedores,
  getLicencas,
  getProdutosPage,
  getProduto,
  getProdutoByCodBarras,
  getProdutosByCategoria,
  getProdutosBySubCategoria,
  getProdutosByLicenca,
  getProdutosByMarca,
  getProdutosByValor,
  getImagens,
  getProdutosByLista,
  getProdutosByLicencaCategoria,
  getProdutos,
} from '../api/client'
import { fetchAndCacheImage } from '../api/imageCache'

export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: getCategorias })
}

export function useFornecedores() {
  return useQuery({ queryKey: ['fornecedores'], queryFn: getFornecedores })
}

export function useLicencas() {
  return useQuery({ queryKey: ['licencas'], queryFn: getLicencas })
}

export function useProdutosPage(pageIndex = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['produtos', 'page', pageIndex, pageSize],
    queryFn: () => getProdutosPage(pageIndex, pageSize),
  })
}

export function useProdutos(enabled) {
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const onProgress = useCallback((e) => {
    setProgress({ loaded: e.loaded, total: e.total || 0 })
  }, [])

  const query = useQuery({
    queryKey: ['produtos', 'all'],
    queryFn: () => getProdutos({ onProgress }),
    staleTime: 10 * 60 * 1000,
    enabled: !!enabled,
  })

  return { ...query, progress }
}

export function useProduto(codigo) {
  return useQuery({
    queryKey: ['produto', codigo],
    queryFn: () => getProduto(codigo),
    enabled: !!codigo,
  })
}

export function useProdutoByCodBarras(codigoBarras) {
  return useQuery({
    queryKey: ['produto', 'codBarras', codigoBarras],
    queryFn: () => getProdutoByCodBarras(codigoBarras),
    enabled: !!codigoBarras,
  })
}

export function useProdutosByCategoria(categoria) {
  return useQuery({
    queryKey: ['produtos', 'categoria', categoria],
    queryFn: () => getProdutosByCategoria(categoria),
    enabled: !!categoria,
  })
}

export function useProdutosBySubCategoria(categoria, subcategoria) {
  return useQuery({
    queryKey: ['produtos', 'subcategoria', categoria, subcategoria],
    queryFn: () => getProdutosBySubCategoria(categoria, subcategoria),
    enabled: !!categoria && !!subcategoria,
  })
}

export function useProdutosByLicenca(licenca) {
  return useQuery({
    queryKey: ['produtos', 'licenca', licenca],
    queryFn: () => getProdutosByLicenca(licenca),
    enabled: !!licenca,
  })
}

export function useProdutosByLicencaCategoria(licenca, categoria) {
  return useQuery({
    queryKey: ['produtos', 'licencaCategoria', licenca, categoria],
    queryFn: () => getProdutosByLicencaCategoria(licenca, categoria),
    enabled: !!licenca && !!categoria,
  })
}

export function useProdutosByLista(codigoLista) {
  return useQuery({
    queryKey: ['produtos', 'lista', codigoLista],
    queryFn: () => getProdutosByLista(codigoLista),
    enabled: !!codigoLista,
  })
}

export function useProdutosByMarca(marca) {
  return useQuery({
    queryKey: ['produtos', 'marca', marca],
    queryFn: () => getProdutosByMarca(marca),
    enabled: !!marca,
  })
}

export function useProdutosByValor(valorDe, valorAte) {
  return useQuery({
    queryKey: ['produtos', 'valor', valorDe, valorAte],
    queryFn: () => getProdutosByValor(valorDe, valorAte),
    enabled: valorDe != null && valorAte != null,
  })
}

export function useImagens(produto) {
  return useQuery({
    queryKey: ['imagens', produto],
    queryFn: () => getImagens(produto),
    enabled: !!produto,
  })
}

export function useImagemCapa(produto) {
  return useQuery({
    queryKey: ['imagemCapa', produto],
    queryFn: () => fetchAndCacheImage(produto),
    enabled: !!produto,
    staleTime: Infinity,
  })
}
