import { createContext, useContext } from 'react'
import type { Wallet } from '../domain/wallet'

export interface WalletContextValue {
  wallet: Wallet
  /** Returns false if the browser refused to save. */
  saveWallet: (wallet: Wallet) => boolean
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext)
  if (!value) throw new Error('useWallet must be used inside <WalletProvider>')
  return value
}
