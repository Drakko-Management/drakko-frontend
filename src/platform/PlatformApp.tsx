import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PlatformLayout } from './PlatformLayout'
import { PlatformLoginPage } from './pages/PlatformLoginPage'
import { OrganizationsPage } from './pages/OrganizationsPage'
import { OrganizationCreatePage } from './pages/OrganizationCreatePage'
import { OrganizationDetailPage } from './pages/OrganizationDetailPage'
import { WaitlistPage } from './pages/WaitlistPage'
import { AuditPage } from './pages/AuditPage'

// Le backoffice « plateforme » (ADR-028), chargé à la demande depuis la route /plateforme/* : le paquet principal
// de l'application n'embarque rien de tout ceci. Aucun lien dans les menus de l'application.
export default function PlatformApp() {
  // Une page d'administration n'a rien à faire dans un moteur de recherche
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      meta.remove()
    }
  }, [])

  return (
    <Routes>
      <Route path="connexion" element={<PlatformLoginPage />} />
      <Route element={<PlatformLayout />}>
        <Route index element={<OrganizationsPage />} />
        <Route path="organisations/nouvelle" element={<OrganizationCreatePage />} />
        <Route path="organisations/:id" element={<OrganizationDetailPage />} />
        <Route path="liste-attente" element={<WaitlistPage />} />
        <Route path="journal" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/plateforme" replace />} />
      </Route>
    </Routes>
  )
}
