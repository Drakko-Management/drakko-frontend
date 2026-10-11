import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  codes: string[]
  onDone: () => void
}

// Les codes de secours ne sont montrés qu'une fois : sans eux, un téléphone perdu bloque le compte. On ne laisse
// terminer qu'une fois la case cochée.
export function RecoveryCodesPanel({ codes, onDone }: Props) {
  const { t } = useTranslation()
  const [noted, setNoted] = useState(false)
  const text = codes.join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('two_factor.codes_copied'))
    } catch {
      toast.error(t('two_factor.codes_copy_error'))
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`Drakko\n${t('two_factor.codes_file_title')}\n\n${text}\n`], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'drakko-codes-de-secours.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t('two_factor.codes_title')}</h3>
        <p className="text-xs text-muted-foreground">{t('two_factor.codes_intro')}</p>
      </div>

      <ul
        aria-label={t('two_factor.codes_title')}
        className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 font-mono text-sm"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={() => void copy()}>
          {t('two_factor.codes_copy')}
        </Button>
        <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={download}>
          {t('two_factor.codes_download')}
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={noted}
          onChange={(e) => setNoted(e.target.checked)}
        />
        <span>{t('two_factor.codes_noted')}</span>
      </label>

      <Button type="button" className="min-h-[44px] w-full" disabled={!noted} onClick={onDone}>
        {t('two_factor.codes_done')}
      </Button>
    </div>
  )
}
