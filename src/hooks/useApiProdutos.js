import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchProdutos as apiSearch, getProduto as apiGetProduto, getCounts as apiGetCounts, getMarcas as apiGetMarcas, importReval, importIdeal } from '../api/produtosClient'

export function useSearchProdutos({ query = '', supplier = 'todos', marca = '', precoMin = '', precoMax = '', page = 1, pageSize = 30 } = {}) {
  const minChars = query.length >= 3
  return useQuery({
    queryKey: ['produtos', 'search', query, supplier, marca, precoMin, precoMax, page, pageSize],
    queryFn: () => apiSearch({ query: minChars ? query : '', supplier, marca, precoMin, precoMax, page, pageSize }),
    placeholderData: (prev) => prev,
  })
}

export function useProduto(supplier, codigo) {
  return useQuery({
    queryKey: ['produto', supplier, codigo],
    queryFn: () => apiGetProduto(supplier, codigo),
    enabled: !!supplier && !!codigo,
  })
}

export function useCounts() {
  return useQuery({
    queryKey: ['produtos', 'counts'],
    queryFn: apiGetCounts,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMarcas() {
  return useQuery({
    queryKey: ['produtos', 'marcas'],
    queryFn: apiGetMarcas,
    staleTime: 5 * 60 * 1000,
  })
}

export function useImportReval() {
  return useCallback(async () => {
    const result = await importReval()
    return result
  }, [])
}

export function useImportIdeal() {
  return useCallback(async () => {
    const result = await importIdeal()
    return result
  }, [])
}
