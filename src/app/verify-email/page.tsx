"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// Component that uses useSearchParams - wrapped in Suspense
function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  
  const [otp, setOtp] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  async function handleVerifyOTP() {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    if (!email) {
      setError("Email not found. Please try signing up again.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      })

      if (verifyError) {
        setError(verifyError.message)
        setIsLoading(false)
      } else {
        setSuccess(true)
        // Redirect to login after successful verification
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 1500)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  async function handleResendCode() {
    if (!email) {
      setError("Email not found. Please try signing up again.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setError(null)
        alert("Verification code resent! Check your email.")
      }
      setIsLoading(false)
    } catch (error) {
      console.error("Resend error:", error)
      setError("Failed to resend code")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a 6-digit code to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {email && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm font-medium">{email}</p>
            </div>
          )}

          {success ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✓ Email verified successfully! Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground text-center">
                  <p>Enter the 6-digit code from your email</p>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value)
                      setError(null)
                    }}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                    {error}
                  </div>
                )}

                <Button 
                  onClick={handleVerifyOTP} 
                  className="w-full" 
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Didn&apos;t receive the code?{" "}
                  <button 
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-primary underline hover:no-underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
