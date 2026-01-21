import { Routes, Route, Navigate } from 'react-router-dom'
import { protectedRoutes, publicRoutes } from '@/configs/routes.config'
import appConfig from '@/configs/app.config'
import AppRoute from './AppRoute'
import PublicRoute from './PublicRoute'
import AuthorityGuard from './AuthorityGuard'
import ProtectedRoute from './ProtectedRoute'

const { authenticatedEntryPath } = appConfig

const AllRoutes = () => {
    return (
        <Routes>
            {/* --- Public Routes (Sign In, Sign Up, etc.) --- */}
            {publicRoutes.map((route) => {
                // ✅ SAFETY CHECK: If the route is empty/undefined, ignore it.
                if (!route) return null

                return (
                    <Route
                        key={route.key}
                        path={route.path}
                        element={
                            <PublicRoute
                                routeKey={route.key}
                                component={route.component}
                                {...route.meta}
                            />
                        }
                    />
                )
            })}

            {/* --- Protected Routes (Dashboard, etc.) --- */}
            <Route path="/" element={<ProtectedRoute />}>
                <Route
                    path="/"
                    element={<Navigate replace to={authenticatedEntryPath} />}
                />

                {protectedRoutes.map((route, index) => {
                    // ✅ SAFETY CHECK: If the route is empty/undefined, ignore it.
                    if (!route) return null

                    return (
                        <Route
                            key={route.key + index}
                            path={route.path}
                            element={
                                <AuthorityGuard
                                    userAuthority={route.authority}
                                    authority={route.authority}
                                >
                                    <AppRoute
                                        routeKey={route.key}
                                        component={route.component}
                                        {...route.meta}
                                    />
                                </AuthorityGuard>
                            }
                        />
                    )
                })}

                <Route
                    path="*"
                    element={<Navigate replace to={authenticatedEntryPath} />}
                />
            </Route>
        </Routes>
    )
}

export default AllRoutes
