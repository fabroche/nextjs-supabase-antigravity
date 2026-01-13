"use client"

import * as React from "react"
import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

// Component that uses useSearchParams - wrapped in Suspense
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get("verified")
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSignUp, setIsSignUp] = React.useState(false)

  // Helper function for button text
  function getButtonText() {
    if (isLoading) return "Loading..."
    return isSignUp ? "Sign up" : "Login"
  }

  // Basic form validation
  function validateForm(email: string, password: string): string | null {
    if (!email || !email.includes("@")) {
      return "Please enter a valid email address"
    }
    if (!password || password.length < 6) {
      return "Password must be at least 6 characters"
    }
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Validate form
    const validationError = validateForm(email, password)
    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      if (isSignUp) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          setIsLoading(false)
        } else {
          // Redirect to verify email page
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        }
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          setIsLoading(false)
        } else {
          // Client-side navigation - contexts stay mounted
          router.push("/")
        }
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-balance text-muted-foreground">
              {isSignUp
                ? "Enter your email below to create your account"
                : "Enter your email below to login to your account"}
            </p>
          </div>

          {verified === "true" && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
              ✓ Email verified successfully! You can now log in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {getButtonText()}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(false)
                    setError(null)
                  }}
                  className="underline"
                  type="button"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(true)
                    setError(null)
                  }}
                  className="underline"
                  type="button"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hidden bg-muted lg:block relative">
        <Image
          src="/assets/login-cover.png"
          alt="Dashboard Analytics"
          fill
          className="object-cover dark:brightness-[0.8]"
          priority
        />
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
