import { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'

interface MiningHardwareRow {
  stats?: {
    tflops?: number
  } | null
}

export function useMiningEngine() {
  const [ncrBalance, setNcrBalance] = useState(0)
  const [activeTflops, setActiveTflops] = useState(0)

  useEffect(() => {
    const initEngine = async () => {
      const { data } = await supabase
        .from('user_economy')
        .select('ncr_balance')
        .eq('id', 'player-1')
        .single()

      if (data) setNcrBalance(data.ncr_balance)
    }

    initEngine()

    const tick = setInterval(async () => {
      const { data: hardware } = await supabase
        .from('user_hardware')
        .select('*')
        .not('slot_id', 'is', null)

      if (!hardware) return

      const tflops = hardware.reduce(
        (acc: number, item: MiningHardwareRow) => acc + (item.stats?.tflops ?? 0),
        0,
      )

      setActiveTflops(tflops)

      if (tflops > 0) {
        const earnings = tflops * 0.05

        setNcrBalance((prev) => {
          const newBalance = prev + earnings

          supabase
            .from('user_economy')
            .update({ ncr_balance: newBalance })
            .eq('id', 'player-1')
            .then(({ error }) => {
              if (error) console.error('Error guardando saldo:', error)
            })

          return newBalance
        })
      }
    }, 10000)

    return () => clearInterval(tick)
  }, [])

  return { ncrBalance, activeTflops }
}
