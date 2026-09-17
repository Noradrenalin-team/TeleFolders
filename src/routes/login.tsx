import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { isTelegramConfigured } from '#/telegram/client'
import {
  useCheckPassword,
  useResendCode,
  useSendCode,
  useSignIn,
} from '#/queries/auth'
import { authErrorMessage } from '#/features/auth/auth-error-message'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/login')({ component: LoginPage })

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, m.auth_error_phone_invalid())

const codeSchema = z.string().trim().min(1, m.auth_error_code_invalid())

const passwordSchema = z.string().min(1, m.auth_error_password_invalid())

type Step =
  | { name: 'phone' }
  | { name: 'code'; phone: string; phoneCodeHash: string }
  | { name: 'password'; phone: string }

function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ name: 'phone' })

  if (!isTelegramConfigured()) {
    return (
      <LoginLayout>
        <p className="text-sm text-destructive">{m.login_not_configured()}</p>
      </LoginLayout>
    )
  }

  if (step.name === 'code') {
    return (
      <LoginLayout>
        <CodeStep
          phone={step.phone}
          phoneCodeHash={step.phoneCodeHash}
          onCodeHashChange={(phoneCodeHash) =>
            setStep({ name: 'code', phone: step.phone, phoneCodeHash })
          }
          onPasswordNeeded={() =>
            setStep({ name: 'password', phone: step.phone })
          }
          onSignedIn={() => void navigate({ to: '/' })}
          onChangeNumber={() => setStep({ name: 'phone' })}
        />
      </LoginLayout>
    )
  }

  if (step.name === 'password') {
    return (
      <LoginLayout>
        <PasswordStep onSignedIn={() => void navigate({ to: '/' })} />
      </LoginLayout>
    )
  }

  return (
    <LoginLayout>
      <PhoneStep
        onCodeSent={(phone, phoneCodeHash) =>
          setStep({ name: 'code', phone, phoneCodeHash })
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

function PhoneStep({
  onCodeSent,
}: {
  onCodeSent: (phone: string, phoneCodeHash: string) => void
}) {
  const sendCode = useSendCode()

  const form = useForm({
    defaultValues: { phone: '' },
    onSubmit: async ({ value }) => {
      try {
        const result = await sendCode.mutateAsync(value.phone)
        onCodeSent(value.phone, result.phoneCodeHash)
      } catch (error) {
        toast.error(authErrorMessage(error))
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <h1 className="text-lg font-semibold">{m.login_phone_title()}</h1>

      <form.Field name="phone" validators={{ onChange: phoneSchema }}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>{m.login_phone_label()}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="tel"
              autoComplete="tel"
              placeholder={m.login_phone_placeholder()}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {String(
                  field.state.meta.errors[0]?.message ??
                    field.state.meta.errors[0],
                )}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {m.login_phone_submit()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

function CodeStep({
  phone,
  phoneCodeHash,
  onCodeHashChange,
  onPasswordNeeded,
  onSignedIn,
  onChangeNumber,
}: {
  phone: string
  phoneCodeHash: string
  onCodeHashChange: (phoneCodeHash: string) => void
  onPasswordNeeded: () => void
  onSignedIn: () => void
  onChangeNumber: () => void
}) {
  const signIn = useSignIn()
  const resendCode = useResendCode()

  const form = useForm({
    defaultValues: { code: '' },
    onSubmit: async ({ value }) => {
      try {
        const result = await signIn.mutateAsync({
          phone,
          phoneCodeHash,
          phoneCode: value.code,
        })
        if (result.status === 'password_needed') {
          onPasswordNeeded()
        } else {
          onSignedIn()
        }
      } catch (error) {
        toast.error(authErrorMessage(error))
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div>
        <h1 className="text-lg font-semibold">{m.login_code_title()}</h1>
        <p className="text-sm text-muted-foreground">
          {m.login_code_description({ phone })}
        </p>
      </div>

      <form.Field name="code" validators={{ onChange: codeSchema }}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>{m.login_code_label()}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {String(
                  field.state.meta.errors[0]?.message ??
                    field.state.meta.errors[0],
                )}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {m.login_code_submit()}
          </Button>
        )}
      </form.Subscribe>

      <div className="flex items-center justify-between text-sm">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          disabled={resendCode.isPending}
          onClick={() => {
            resendCode.mutate(
              { phone, phoneCodeHash },
              {
                onSuccess: (result) => onCodeHashChange(result.phoneCodeHash),
                onError: (error) => toast.error(authErrorMessage(error)),
              },
            )
          }}
        >
          {m.login_code_resend()}
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          onClick={onChangeNumber}
        >
          {m.login_code_change_number()}
        </Button>
      </div>
    </form>
  )
}

function PasswordStep({ onSignedIn }: { onSignedIn: () => void }) {
  const checkPassword = useCheckPassword()

  const form = useForm({
    defaultValues: { password: '' },
    onSubmit: async ({ value }) => {
      try {
        await checkPassword.mutateAsync(value.password)
        onSignedIn()
      } catch (error) {
        toast.error(authErrorMessage(error))
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div>
        <h1 className="text-lg font-semibold">{m.login_password_title()}</h1>
        <p className="text-sm text-muted-foreground">
          {m.login_password_description()}
        </p>
      </div>

      <form.Field name="password" validators={{ onChange: passwordSchema }}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>{m.login_password_label()}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="current-password"
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {String(
                  field.state.meta.errors[0]?.message ??
                    field.state.meta.errors[0],
                )}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {m.login_password_submit()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
