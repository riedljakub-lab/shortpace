import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Wallet } from '../domain/wallet'
import { walletStore } from '../storage/storage'
import { WalletContext } from './walletContext'

/** Loads the wallet (purchases + shorts you're wearing) once and shares it. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet>(() => walletStore.getWallet())

  const saveWallet = useCallback((next: Wallet) => {
    setWallet(next)
    return walletStore.saveWallet(next)
  }, [])

  const value = useMemo(() => ({ wallet, saveWallet }), [wallet, saveWallet])
  return <WalletContext value={value}>{children}</WalletContext>
}
