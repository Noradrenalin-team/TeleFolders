import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isTelegramConfigured } from '#/telegram/client'
import { authStateQueryOptions } from '#/queries/auth'
import type { SentCode } from '#/telegram/auth'
import { PhoneStep } from '#/features/auth/PhoneStep'
import { CodeStep } from '#/features/auth/CodeStep'
import { PasswordStep } from '#/features/auth/PasswordStep'
import { DEFAULT_MATRIX_SEARCH } from '#/features/matrix/filters'
import { m } from '#/paraglide/messages'
import { FullPageSpinner } from '#/components/FullPageSpinner'

export const Route = createFileRoute('/login')({ component: LoginPage })

type Step =
  | { name: 'phone' }
  | { name: 'code'; phone: string; sentCode: SentCode }
  | { name: 'password'; phone: string }

function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ name: 'phone' })

  // Already signed in (e.g. a bookmarked /login, or the future-auth-token
  // "already logged in" case in sendCode) — go straight to the matrix
  // instead of showing a login form there's nothing left to fill in.
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  useEffect(() => {
    if (authState.data?.status === 'authorized') {
      void navigate({ to: '/matrix', search: DEFAULT_MATRIX_SEARCH })
    }
  }, [authState.data, navigate])

  if (!isTelegramConfigured()) {
    return (
      <LoginLayout>
        <p className="text-sm text-destructive">{m.login_not_configured()}</p>
      </LoginLayout>
    )
  }

  // Until we know whether a session already exists, showing the form would
  // just flash it at signed-in users before the redirect above kicks in.
  if (authState.isPending || authState.data?.status === 'authorized') {
    return <FullPageSpinner />
  }

  const goToMatrix = () =>
    void navigate({ to: '/matrix', search: DEFAULT_MATRIX_SEARCH })

  if (step.name === 'code') {
    return (
      <LoginLayout>
        <CodeStep
          phone={step.phone}
          initialSentCode={step.sentCode}
          onPasswordNeeded={() =>
            setStep({ name: 'password', phone: step.phone })
          }
          onSignedIn={goToMatrix}
          onChangeNumber={() => setStep({ name: 'phone' })}
        />
      </LoginLayout>
    )
  }

  if (step.name === 'password') {
    return (
      <LoginLayout>
        <PasswordStep
          onSignedIn={goToMatrix}
          onBack={() => setStep({ name: 'phone' })}
        />
      </LoginLayout>
    )
  }

  return (
    <LoginLayout>
      <PhoneStep
        onCodeSent={(phone, sentCode) =>
          setStep({ name: 'code', phone, sentCode })
        }
      />
    </LoginLayout>
  )
}

function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      {children}
      <p className="text-center text-xs text-muted-foreground">
        {m.login_disclaimer()}
      </p>
    </div>
  )
}
