import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { Stepper } from './Stepper'

// ── Traductions ────────────────────────────────────────────────────────────

describe('Stepper — traductions', () => {
  afterEach(async () => {
    await i18n.changeLanguage('fr')
  })

  it.each([
    ['fr', ['Brouillon', 'Planifié', 'En cours', 'Signature', 'Levée', 'Terminé']],
    ['en', ['Draft', 'Planned', 'In progress', 'Signature', 'Snagging', 'Completed']],
    ['es', ['Borrador', 'Planificado', 'En curso', 'Firma', 'Reservas', 'Terminado']],
    ['it', ['Bozza', 'Pianificato', 'In corso', 'Firma', 'Riserve', 'Completato']],
    ['de', ['Entwurf', 'Geplant', 'In Bearbeitung', 'Unterschrift', 'Mängel', 'Abgeschlossen']],
  ])('affiche les 6 étapes en %s', async (lang, labels) => {
    await i18n.changeLanguage(lang)
    render(<Stepper status="DRAFT" hasReserveLift />)
    labels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument())
  })
})

// ── Labels ─────────────────────────────────────────────────────────────────

describe('Stepper — labels', () => {
  it('affiche les 5 labels courts', () => {
    render(<Stepper status="DRAFT" />)
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
    expect(screen.getByText('Planifié')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Signature')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })
})

// ── DRAFT (index 0) ────────────────────────────────────────────────────────

describe('Stepper — DRAFT', () => {
  it('affiche les numéros 1 à 5 (aucune étape terminée)', () => {
    render(<Stepper status="DRAFT" />)
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('ne contient aucune icône Check (0 étape terminée)', () => {
    const { container } = render(<Stepper status="DRAFT" />)
    expect(container.querySelectorAll('svg').length).toBe(0)
  })
})

// ── PLANNED (index 1) ──────────────────────────────────────────────────────

describe('Stepper — PLANNED', () => {
  it('affiche 1 icône Check (étape 1 terminée)', () => {
    const { container } = render(<Stepper status="PLANNED" />)
    expect(container.querySelectorAll('svg').length).toBe(1)
  })

  it('n\'affiche pas le numéro 1 (remplacé par Check)', () => {
    render(<Stepper status="PLANNED" />)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('affiche les numéros 2, 3, 4, 5', () => {
    render(<Stepper status="PLANNED" />)
    ;['2', '3', '4', '5'].forEach((n) => expect(screen.getByText(n)).toBeInTheDocument())
  })
})

// ── IN_PROGRESS (index 2) ─────────────────────────────────────────────────

describe('Stepper — IN_PROGRESS', () => {
  it('affiche 2 icônes Check (étapes 1-2 terminées)', () => {
    const { container } = render(<Stepper status="IN_PROGRESS" />)
    expect(container.querySelectorAll('svg').length).toBe(2)
  })

  it('n\'affiche pas les numéros 1 et 2 (remplacés par Check)', () => {
    render(<Stepper status="IN_PROGRESS" />)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('affiche les numéros 3, 4, 5 (courante + en attente)', () => {
    render(<Stepper status="IN_PROGRESS" />)
    ;['3', '4', '5'].forEach((n) => expect(screen.getByText(n)).toBeInTheDocument())
  })
})

// ── AWAITING_SIGNATURE (index 3) ──────────────────────────────────────────

describe('Stepper — AWAITING_SIGNATURE', () => {
  it('affiche 3 icônes Check', () => {
    const { container } = render(<Stepper status="AWAITING_SIGNATURE" />)
    expect(container.querySelectorAll('svg').length).toBe(3)
  })

  it('affiche les numéros 4 et 5', () => {
    render(<Stepper status="AWAITING_SIGNATURE" />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

// ── COMPLETED (index 4) ────────────────────────────────────────────────────

describe('Stepper — COMPLETED', () => {
  it('affiche 4 icônes Check (étapes 1-4 terminées)', () => {
    const { container } = render(<Stepper status="COMPLETED" />)
    expect(container.querySelectorAll('svg').length).toBe(4)
  })

  it('affiche uniquement le numéro 5 (étape courante)', () => {
    render(<Stepper status="COMPLETED" />)
    expect(screen.getByText('5')).toBeInTheDocument()
    ;['1', '2', '3', '4'].forEach((n) =>
      expect(screen.queryByText(n)).not.toBeInTheDocument(),
    )
  })
})

// ── DISPUTED (index 3 — même que AWAITING_SIGNATURE) ─────────────────────

describe('Stepper — DISPUTED', () => {
  it('affiche 3 icônes Check (même ordre que AWAITING_SIGNATURE)', () => {
    const { container } = render(<Stepper status="DISPUTED" />)
    expect(container.querySelectorAll('svg').length).toBe(3)
  })
})

// ── Connecteurs ────────────────────────────────────────────────────────────

describe('Stepper — connecteurs', () => {
  it('affiche 4 connecteurs entre 5 étapes', () => {
    const { container } = render(<Stepper status="DRAFT" />)
    // connector = div.h-0.5 between steps
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors.length).toBe(4)
  })

  it('applique la className additionnelle', () => {
    const { container } = render(<Stepper status="DRAFT" className="my-4" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-4')
  })
})
