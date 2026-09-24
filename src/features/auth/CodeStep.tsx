import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { z } from '#/lib/zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useResendCode, useSignIn } from '#/queries/auth'
import type { SentCode } from '#/telegram/auth'
import { authErrorMessage } from '#/features/auth/auth-error-message'
import { m } from '#/paraglide/messages'

export function CodeStep({
  phone,
  initialSentCode,
  onPasswordNeeded,
  onSignedIn,
  onChangeNumber,
}: {
  phone: string
  initialSentCode: SentCode
  onPasswordNeeded: () => void
  onSignedIn: () => void
  onChangeNumber: () => void
}) {
  const signIn = useSignIn()
  const resendCode = useResendCode()
  const [sentCode, setSentCode] = useState(initialSentCode)
  const [secondsLeft, setSecondsLeft] = useState(initialSentCode.timeoutSec)

  // F1.3: the resend button stays disabled until Telegram's own cooldown
  // (`SentCode.timeoutSec`) runs out — resending earlier than that either
  // fails or just repeats the same delivery.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const codeSchema = z.string().trim().min(1, m.auth_error_code_invalid())

  const form = useForm({
    defaultValues: { code: '' },
    onSubmit: async ({ value }) => {
      try {
        const result = await signIn.mutateAsync({
          phone,
          phoneCodeHash: sentCode.phoneCodeHash,
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
          disabled={resendCode.isPending || secondsLeft > 0}
          onClick={() => {
            resendCode.mutate(
              { phone, phoneCodeHash: sentCode.phoneCodeHash },
              {
                onSuccess: (result) => {
                  if (result.status === 'code') {
                    setSentCode(result.sentCode)
                    setSecondsLeft(result.sentCode.timeoutSec)
                  }
                  // `status: 'ok'`: already signed in, same as above.
                },
                onError: (error) => toast.error(authErrorMessage(error)),
              },
            )
          }}
        >
          {secondsLeft > 0
            ? m.login_code_resend_in({ seconds: secondsLeft })
            : m.login_code_resend()}
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
