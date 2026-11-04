import type { ComponentType } from 'react'
import type { PermModule } from '@/types/api'
import { ProjectsDashboardWidget } from './chantiers/ProjectsDashboardWidget'
import { QuotesDashboardWidget } from './devis/QuotesDashboardWidget'
import { InvoicesDashboardWidget } from './factures/InvoicesDashboardWidget'

/**
 * Blocs du tableau de bord, un par module au plus. Un module absent d'ici n'apporte rien au tableau
 * de bord (il reste dans les menus). Les blocs s'affichent dans l'ordre du registre, seulement si
 * l'utilisateur peut lire le module : un bloc ne vérifie donc pas lui-même les droits de lecture.
 */
export const DASHBOARD_WIDGETS: Partial<Record<PermModule, ComponentType>> = {
  chantiers: ProjectsDashboardWidget,
  devis: QuotesDashboardWidget,
  factures: InvoicesDashboardWidget,
}
