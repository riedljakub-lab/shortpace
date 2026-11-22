import { useState } from 'react'
import { Navigate } from 'react-router'
import { SHORTS_STYLES, type ShortsStyleId } from '../../config/cosmetics'
import { DISTANCE_CLASSES, distanceClass, type DistanceClassId } from '../../config/distances'
import { CLASS_SWITCH_COST } from '../../config/economy'
import { SPLIT_FROM_LEVEL } from '../../config/levels'
import { SAFETY_LINE } from '../../config/safety'
import { classLockStatus } from '../../domain/classLock'
import { todayIso } from '../../domain/dates'
import { progression } from '../../domain/levels'
import { needsMarathonWarning } from '../../domain/novice'
import {
  buyShorts,
  canBuyShorts,
  canSwitchClass,
  coinBalance,
  equipShorts,
  ownsShorts,
  recordClassSwitch,
} from '../../domain/wallet'
import { useProfile } from '../../profile/profileContext'
import { useRuns } from '../../runs/runsContext'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { SelectField } from '../../ui/form'
import { Notice } from '../../ui/Notice'
import { useWallet } from '../../wallet/walletContext'
import { newRunId as newId } from '../log/runDraft'

export function ShopPage() {
  const { profile, saveProfile } = useProfile()
  const { runs } = useRuns()
  const { wallet, saveWallet } = useWallet()
  const [message, setMessage] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null)
  const [target, setTarget] = useState<DistanceClassId | ''>('')

  if (!profile) return <Navigate to="/onboarding" replace />

  const today = todayIso()
  const progress = progression(profile, runs, today)
  const balance = coinBalance(progress.coins, wallet)
  const lock = classLockStatus(profile.classChosenOn, today)
  // The lock message, whatever distance you'd pick (and however many coins you have).
  const lockCheck = canSwitchClass(profile, '5k', today, Number.POSITIVE_INFINITY)
  const marathonWarning =
    target === 'marathon' && needsMarathonWarning({ ...profile, distanceClass: 'marathon' })

  function buy(id: ShortsStyleId) {
    const check = canBuyShorts(wallet, id, balance)
    if (!check.ok) {
      setMessage({ tone: 'warning', text: check.message })
      return
    }
    saveWallet(buyShorts(wallet, id, today, newId()))
    const style = SHORTS_STYLES.find((s) => s.id === id)
    setMessage({
      tone: 'info',
      text: `${style?.name ?? 'New'} shorts bought. You’re wearing them.`,
    })
  }

  function wear(id: ShortsStyleId) {
    saveWallet(equipShorts(wallet, id))
    const style = SHORTS_STYLES.find((s) => s.id === id)
    setMessage({ tone: 'info', text: `Now wearing ${style?.name ?? 'them'}.` })
  }

  function switchClass() {
    if (!target || !profile) return
    const check = canSwitchClass(profile, target, today, balance)
    if (!check.ok) {
      setMessage({ tone: 'warning', text: check.message })
      return
    }
    const from = distanceClass(profile.distanceClass).label
    const to = distanceClass(target).label
    const ok = window.confirm(
      `Switch from the ${from} to the ${to} for ${CLASS_SWITCH_COST} coins? Your plan updates straight away.`,
    )
    if (!ok) return
    saveWallet(recordClassSwitch(wallet, profile.distanceClass, target, today, newId()))
    saveProfile({ ...profile, distanceClass: target })
    setTarget('')
    setMessage({ tone: 'info', text: `Switched to the ${to}. Your plan has been updated.` })
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shop</h1>
        <p className="text-lg">
          You have <strong className="tabular-nums">{balance} coins</strong>.
        </p>
        <p className="text-muted">
          Earn coins by running, resting on rest days and completing weeks. No real money, ever.
        </p>
      </div>

      <div role="status">
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      </div>

      <section aria-labelledby="shorts-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="shorts-heading" className="text-xl font-bold tracking-tight">
            Shorts
          </h2>
          <p className="text-muted">Color and pattern only. The length is earned on the road.</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SHORTS_STYLES.map((style) => {
            const owned = ownsShorts(wallet, style.id)
            const wearing = wallet.equippedShorts === style.id
            const short = !owned && balance < style.price
            return (
              <li
                key={style.id}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
                  wearing ? 'border-2 border-accent bg-accent-soft' : 'border-line'
                }`}
              >
                <Avatar
                  avatarId={profile.avatarId}
                  inseamCm={progress.rung.inseamCm}
                  cargoPocket={progress.level === 1 || progress.regress !== null}
                  split={progress.level >= SPLIT_FROM_LEVEL}
                  shortsColor={style.color}
                  shortsPattern={style.pattern}
                  decorative
                  className="h-32 w-auto"
                />
                <p className="font-semibold">{style.name}</p>
                <p className="text-sm text-muted">
                  {style.price === 0 ? 'Free' : `${style.price} coins`}
                </p>
                {wearing ? (
                  <p className="text-sm font-semibold text-accent">Wearing</p>
                ) : owned ? (
                  <Button
                    variant="secondary"
                    onClick={() => wear(style.id)}
                    aria-label={`Wear ${style.name}`}
                  >
                    Wear
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={short ? 'secondary' : 'primary'}
                      onClick={() => buy(style.id)}
                      aria-label={`Buy ${style.name} for ${style.price} coins`}
                    >
                      Buy
                    </Button>
                    {short ? (
                      <p className="text-xs text-muted">Need {style.price - balance} more</p>
                    ) : null}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="switch-heading" className="flex max-w-xl flex-col gap-4">
        <div>
          <h2 id="switch-heading" className="text-xl font-bold tracking-tight">
            Switch distance
          </h2>
          <p className="text-muted">
            You’re training for the {distanceClass(profile.distanceClass).label}. After your first
            30 days you can switch for {CLASS_SWITCH_COST} coins.
          </p>
        </div>

        {lock.locked && !lockCheck.ok ? (
          <Notice>{lockCheck.message}</Notice>
        ) : (
          <>
            <SelectField
              id="switch-target"
              label="New distance"
              value={target}
              onChange={(e) => setTarget(e.target.value as DistanceClassId | '')}
            >
              <option value="">Choose a distance</option>
              {DISTANCE_CLASSES.filter((d) => d.id !== profile.distanceClass).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </SelectField>

            {marathonWarning ? (
              <Notice tone="strong">
                <strong>A marathon is a big step without a running base.</strong> Most runners get
                there via 5K, 10K and the half first. You can still switch. It’s your call.
              </Notice>
            ) : null}
            {target === 'marathon' ? <p className="text-sm font-medium">{SAFETY_LINE}</p> : null}

            <div>
              <Button onClick={switchClass} disabled={!target} className="disabled:opacity-50">
                Switch for {CLASS_SWITCH_COST} coins
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
