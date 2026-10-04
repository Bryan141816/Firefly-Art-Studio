import { Routes, Route, useLocation, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"

import AppLayout from "@/components/app-layout"
import LoginPage from "./pages/Login"
import Projects from "./pages/Projects"
import type { User } from "./types/User"
import ProjectView from "./pages/ProjectView"

function References() {
  return <h1>References</h1>
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
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

    document.title = `Firefly Art Studio | ${titles[location.pathname]}`
  }, [location.pathname])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/me", {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user")
        }

        const user: User = await response.json()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          user ? (
            <AppLayout user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<Projects />} />
        <Route path="/references" element={<References />} />
        <Route path="/project" element={<ProjectView/>} />
      </Route>
    </Routes>
  )
}

export default App