import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useSendCode } from '#/queries/auth'
import type { SentCode } from '#/telegram/auth'
import { authErrorMessage } from '#/features/auth/auth-error-message'
import {
  COUNTRIES,
  DEFAULT_COUNTRY_ISO,
  countryLabel,
  findCountry,
} from '#/features/auth/countries'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

export function PhoneStep({
  onCodeSent,
}: {
  onCodeSent: (phone: string, sentCode: SentCode) => void
}) {
  const sendCode = useSendCode()
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
  const country = findCountry(countryIso)
  const locale = getLocale()

  // Built per render, not at module scope — `m.xxx()` reads the *current*
  // locale, and a module-level schema would freeze its message in whatever
  // locale was active the first time this file was imported (F8.1).
  const nationalNumberSchema = z
    .string()
    .refine(
      (value) => /^\d{4,14}$/.test(value.replace(/\D/g, '')),
      m.auth_error_phone_invalid(),
    )

  const form = useForm({
    defaultValues: { nationalNumber: '' },
    onSubmit: async ({ value }) => {
      const digits = value.nationalNumber.replace(/\D/g, '')
      const phone = `+${country.dialCode}${digits}`
      try {
        const result = await sendCode.mutateAsync(phone)
        if (result.status === 'code') {
          onCodeSent(phone, result.sentCode)
        }
        // `status: 'ok'`: useSendCode's onSuccess already marked the session
        // authorized — the route's own redirect effect takes it from here.
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

      <div className="flex gap-2">
        <div className="flex w-32 shrink-0 flex-col gap-1.5">
          <Label htmlFor="country">{m.login_country_label()}</Label>
          <Select value={countryIso} onValueChange={setCountryIso}>
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.iso} value={c.iso}>
                  {countryLabel(c.iso, locale)} +{c.dialCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form.Field
          name="nationalNumber"
          validators={{ onChange: nationalNumberSchema }}
        >
          {(field) => (
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={field.name}>{m.login_phone_label()}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                placeholder={country.example}
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
      </div>

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
