import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { PrivateRoute } from './PrivateRoute'
import { TWO_FACTOR_ROUTE } from './two-factor-route'
import { CanRoute } from './CanRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ScrollLayout } from '@/components/layout/ScrollLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { TwoFactorRequiredPage } from '@/pages/auth/TwoFactorRequiredPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { PhotosPage } from '@/pages/projects/PhotosPage'
import { ReportPage } from '@/pages/projects/ReportPage'
import { CreateProjectPage } from '@/pages/projects/CreateProjectPage'
import { ExpressProjectPage } from '@/pages/projects/ExpressProjectPage'
import { EditProjectPage } from '@/pages/projects/EditProjectPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { CreateClientPage } from '@/pages/clients/CreateClientPage'
import { EditUserPage } from '@/pages/users/EditUserPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { CreateUserPage } from '@/pages/users/CreateUserPage'
import { CreateRolePage } from '@/pages/users/CreateRolePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { SettingsProfilPage } from '@/pages/settings/SettingsProfilPage'
import { SettingsAppearancePage } from '@/pages/settings/SettingsAppearancePage'
import { SettingsFiltersPage } from '@/pages/settings/SettingsFiltersPage'
import { SettingsNavigationPage } from '@/pages/settings/SettingsNavigationPage'
import { SettingsEnterprisePage } from '@/pages/settings/SettingsEnterprisePage'
import { SettingsTutorialsPage } from '@/pages/settings/SettingsTutorialsPage'
import { ServicesPage } from '@/pages/services/ServicesPage'
import { EditServicePage } from '@/pages/services/EditServicePage'
import { CreateServicePage } from '@/pages/services/CreateServicePage'
import { SignPage } from '@/pages/public/SignPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage'

// Le backoffice de la plateforme (ADR-028) n'est chargé que si on ouvre /plateforme : le paquet principal n'en contient rien
const PlatformApp = lazy(() => import('@/platform/PlatformApp'))

// Les routes sont séparées du routeur pour pouvoir être lues dans les tests sans créer un routeur de navigateur
const routeTree: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/mot-de-passe-oublie',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reinitialiser-mot-de-passe',
    element: <ResetPasswordPage />,
  },
  {
    path: '/sign/:token',
    element: <SignPage />,
  },
  {
    path: '/plateforme/*',
    element: (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        }
      >
        <PlatformApp />
      </Suspense>
    ),
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: TWO_FACTOR_ROUTE, element: <TwoFactorRequiredPage /> },
      {
        element: <AppShell />,
        children: [
          {
            // Une erreur d'affichage dans un écran : message dans la coque, la navigation reste utilisable
            errorElement: <RouteErrorPage />,
            children: [
              // Pages with sticky header (manage their own scroll)
              { path: 'chantiers', element: <ProjectsPage /> },
              {
                element: <CanRoute module="clients" action="read" />,
                children: [
                  { path: 'clients', element: <ClientsPage /> },
                ],
              },
              {
                element: <CanRoute module="prestations" action="read" />,
                children: [
                  { path: 'prestations', element: <ServicesPage /> },
                ],
              },
              // All other pages scroll normally inside ScrollLayout
              {
                element: <ScrollLayout />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'chantiers/:id', element: <ProjectDetailPage /> },
                  { path: 'chantiers/:id/photos', element: <PhotosPage /> },
                  { path: 'chantiers/:id/rapport', element: <ReportPage /> },
                  { path: 'parametres', element: <SettingsPage /> },
                  { path: 'parametres/profil', element: <SettingsProfilPage /> },
                  { path: 'parametres/apparence', element: <SettingsAppearancePage /> },
                  { path: 'parametres/filtres', element: <SettingsFiltersPage /> },
                  { path: 'parametres/navigation', element: <SettingsNavigationPage /> },
                  { path: 'parametres/entreprise', element: <SettingsEnterprisePage /> },
                  { path: 'parametres/tutoriels', element: <SettingsTutorialsPage /> },
                  {
                    element: <CanRoute module="chantiers" action="create" />,
                    children: [
                      { path: 'chantiers/nouveau', element: <CreateProjectPage /> },
                      { path: 'chantiers/express', element: <ExpressProjectPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="chantiers" action="update" />,
                    children: [
                      { path: 'chantiers/:id/modifier', element: <EditProjectPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="clients" action="read" />,
                    children: [
                      { path: 'clients/:id', element: <ClientDetailPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="clients" action="create" />,
                    children: [
                      { path: 'clients/nouveau', element: <CreateClientPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="equipe" action="read" />,
                    children: [
                      { path: 'utilisateurs', element: <UsersPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="equipe" action="update" />,
                    children: [
                      { path: 'utilisateurs/:id', element: <EditUserPage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="equipe" action="create" />,
                    children: [
                      { path: 'utilisateurs/nouveau', element: <CreateUserPage /> },
                      { path: 'utilisateurs/roles/nouveau', element: <CreateRolePage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="prestations" action="create" />,
                    children: [
                      { path: 'prestations/nouveau', element: <CreateServicePage /> },
                    ],
                  },
                  {
                    element: <CanRoute module="prestations" action="update" />,
                    children: [
                      { path: 'prestations/:id/modifier', element: <EditServicePage /> },
                    ],
                  },
                  // Toute autre adresse : une page « introuvable » dans l'application (sans session, PrivateRoute renvoie vers la connexion)
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

// Erreur d'affichage hors d'un écran de la coque (connexion, signature, coque elle-même) : page plein écran
export const routes: RouteObject[] = routeTree.map((route) => ({ ...route, errorElement: <RouteErrorPage screen /> }))
