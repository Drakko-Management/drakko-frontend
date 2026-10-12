import { Outlet } from 'react-router'

export function ScrollLayout() {
  return (
    <div className="flex-1 overflow-y-auto p-4 pb-nav lg:pb-4">
      <Outlet />
    </div>
  )
}
