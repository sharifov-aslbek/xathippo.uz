import dashboardsRoute from './dashboardsRoute'
import conceptsRoute from './conceptsRoute'
import uiComponentsRoute from './uiComponentsRoute'
import authRoute from './authRoute'
import guideRoute from './guideRoute'
import othersRoute from './othersRoute'
import branchRoute from './branchRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes: Routes = [
    ...dashboardsRoute,
    ...conceptsRoute,
    ...uiComponentsRoute,
    ...guideRoute,
    ...branchRoute,
    ...othersRoute,
]
