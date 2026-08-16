import { create } from 'zustand'
import { DEFAULT_PARAMS } from '@/lib/constants'
import type { Params } from '@/types'

interface ParamsState {
  params: Params
  setParams: (params: Params) => void
  resetParams: () => void
}

export const useParamsStore = create<ParamsState>((set) => ({
  params: JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as Params,
  setParams: (params) => set({ params }),
  resetParams: () => set({ params: JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as Params }),
}))
