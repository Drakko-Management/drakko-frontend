import { createBrowserRouter } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { CanRoute } from './CanRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ScrollLayout } from '@/components/layout/ScrollLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
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
import { UsersPage } from '@/pages/users/UsersPage'
import { CreateUserPage } from '@/pages/users/CreateUserPage'
import { CreateRolePage } from '@/pages/users/CreateRolePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { SettingsProfilPage } from '@/pages/settings/SettingsProfilPage'
import { SettingsAppearancePage } from '@/pages/settings/SettingsAppearancePage'
import { SettingsNavigationPage } from '@/pages/settings/SettingsNavigationPage'
import { SettingsEnterprisePage } from '@/pages/settings/SettingsEnterprisePage'
import { ServicesPage } from '@/pages/services/ServicesPage'
import { CreateServicePage } from '@/pages/services/CreateServicePage'
import { SignPage } from '@/pages/public/SignPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/sign/:token',
    element: <SignPage />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppShell />,
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
              { path: 'parametres/navigation', element: <SettingsNavigationPage /> },
              { path: 'parametres/entreprise', element: <SettingsEnterprisePage /> },
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
            ],
          },
        ],
      },
    ],
  },
])
