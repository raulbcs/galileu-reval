import { useQuery } from '@tanstack/react-query'
import { getImagens } from '../api/revalClient'

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
    queryFn: async () => {
      const res = await fetch(`/cached-images/${produto}`)
      if (!res.ok) return null
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    },
    enabled: !!produto,
    staleTime: Infinity,
  })
}
