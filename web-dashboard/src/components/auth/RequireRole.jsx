import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { roleMayAccessPath } from '../../config/roleNav'

/**
 * Wraps a page: if the signed-in role may not open this path segment, redirect home.
 * @param {object} props
 * @param {string} props.pathSegment Route path segment (e.g. 'children', 'reports'); use '' for dashboard index.
 * @param {import('react').ReactNode} props.children
 */
export default function RequireRole({ pathSegment, children }) {
  const role = useAuthStore(s => s.user?.role)
  if (!roleMayAccessPath(role, pathSegment)) {
    return <Navigate to="/" replace />
  }
  return children
}
