import { Routes, Route, useLocation, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"

import AppLayout from "@/components/app-layout"
import LoginPage from "./pages/Login"
import ProjectsList from "./pages/ProjectsList"
import type { User } from "./types/User"
import ProjectEditor from "./pages/ProjectEditor"
import { apiFetch } from "./lib/api"

function References() {
  return <h1>References</h1>
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center w-full">
      <div className="text-muted-foreground">
        Loading...
      </div>
    </div>
  )
}

function App() {
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Projects",
      "/references": "References",
      "/login": "Login",
    }

    document.title =
      `Firefly Art Studio | ${titles[location.pathname] ?? "Firefly Art Studio"}`
  }, [location.pathname])

  useEffect(() => {
    apiFetch("/me", {
      credentials: "include",
    })
      .then(async response => {
        if (!response.ok) {
          setUser(null)
          return
        }

        const user: User = await response.json()
        setUser(user)
      })
      .catch(error => {
        console.error("Error fetching user:", error)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <AppLayout user={user} />
        }
      >
        <Route
          path="/"
          element={
            loading ? <LoadingScreen /> : user ? <ProjectsList /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/references"
          element={
            loading ? <LoadingScreen /> : user ? <References /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/project/:projectId"
          element={
            loading ? <LoadingScreen /> : user ? <ProjectEditor /> : <Navigate to="/login" replace />
          }
        />
      </Route>
    </Routes>
  )
}

export default App