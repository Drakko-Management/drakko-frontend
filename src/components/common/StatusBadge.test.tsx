import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import type { ProjectStatus } from '@/types/api'

// ── Mapping exhaustif ──────────────────────────────────────────────────────

const EXPECTED: Record<ProjectStatus, { label: string; colorToken: string }> = {
  DRAFT:               { label: 'Brouillon',               colorToken: 'gray' },
  PLANNED:             { label: 'Planifié',                colorToken: 'blue' },
  IN_PROGRESS:         { label: 'En cours',                colorToken: 'amber' },
  AWAITING_SIGNATURE:    { label: 'Signature',               colorToken: 'orange' },
  AWAITING_RESERVE_LIFT: { label: 'Réserves en cours',       colorToken: 'amber' },
  COMPLETED:             { label: 'Terminé',                 colorToken: 'green' },
  DISPUTED:              { label: 'Litige',                  colorToken: 'red' },
}

// ── Libellés ───────────────────────────────────────────────────────────────

describe('StatusBadge — libellés', () => {
  it.each(Object.entries(EXPECTED))(
    'status=%s → affiche "%s"',
    (status, { label }) => {
      render(<StatusBadge status={status as ProjectStatus} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    },
  )
})

// ── Couleurs ───────────────────────────────────────────────────────────────

describe('StatusBadge — couleurs Tailwind', () => {
  it.each(Object.entries(EXPECTED))(
    'status=%s → contient la couleur "%s"',
    (status, { colorToken }) => {
      const { container } = render(<StatusBadge status={status as ProjectStatus} />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain(colorToken)
    },
  )
})

// ── Structure HTML ─────────────────────────────────────────────────────────

describe('StatusBadge — structure', () => {
  it('rend un élément <span>', () => {
    const { container } = render(<StatusBadge status="DRAFT" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('applique la className additionnelle passée en prop', () => {
    const { container } = render(<StatusBadge status="DRAFT" className="mt-2" />)
    expect((container.firstChild as HTMLElement).className).toContain('mt-2')
  })

  it('contient les classes de base (rounded-full, text-xs, font-medium)', () => {
    const { container } = render(<StatusBadge status="COMPLETED" />)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('rounded-full')
    expect(cls).toContain('text-xs')
    expect(cls).toContain('font-medium')
  })

  it('les 7 statuts ont un libellé distinct (pas de doublons)', () => {
    const labels = Object.values(EXPECTED).map((e) => e.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
