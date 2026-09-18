import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useCheckPassword, usePasswordHint } from '#/queries/auth'
import { authErrorMessage } from '#/features/auth/auth-error-message'
import { m } from '#/paraglide/messages'

export function PasswordStep({
  onSignedIn,
  onBack,
}: {
  onSignedIn: () => void
  onBack: () => void
}) {
  const checkPassword = useCheckPassword()
  const hintQuery = usePasswordHint(true)

  const passwordSchema = z.string().min(1, m.auth_error_password_invalid())

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
        {hintQuery.data && (
          <p className="mt-1 text-sm text-muted-foreground italic">
            {m.login_password_hint({ hint: hintQuery.data })}
          </p>
        )}
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

      <Button
        type="button"
        variant="link"
        size="sm"
        className="self-start px-0"
        onClick={onBack}
      >
        {m.login_password_back()}
      </Button>
    </form>
  )
}
