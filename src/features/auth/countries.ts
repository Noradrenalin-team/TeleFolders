/**
 * A practical subset of dialing codes (F1.1), not the full E.164 registry —
 * good enough to pick a country and see a correctly-shaped example number.
 * Anyone whose country isn't listed can still type a full `+<code>...`
 * number by hand; the phone schema only requires a leading `+` and digits.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, used both as the React key and with
   * `Intl.DisplayNames` to get a localized country name. */
  iso: string
  dialCode: string
  /** Example *national* number (no country code), shown as the input's
   * placeholder so the expected shape is obvious without a live mask. */
  example: string
}

export const COUNTRIES: Country[] = [
  { iso: 'RU', dialCode: '7', example: '900 123-45-67' },
  { iso: 'UA', dialCode: '380', example: '50 123 4567' },
  { iso: 'BY', dialCode: '375', example: '29 123-45-67' },
  { iso: 'KZ', dialCode: '7', example: '701 123 4567' },
  { iso: 'AM', dialCode: '374', example: '77 123456' },
  { iso: 'AZ', dialCode: '994', example: '40 123 45 67' },
  { iso: 'GE', dialCode: '995', example: '555 12 34 56' },
  { iso: 'UZ', dialCode: '998', example: '90 123 45 67' },
  { iso: 'US', dialCode: '1', example: '(201) 555-0123' },
  { iso: 'GB', dialCode: '44', example: '7400 123456' },
  { iso: 'DE', dialCode: '49', example: '151 12345678' },
  { iso: 'FR', dialCode: '33', example: '6 12 34 56 78' },
  { iso: 'IT', dialCode: '39', example: '312 345 6789' },
  { iso: 'ES', dialCode: '34', example: '612 34 56 78' },
  { iso: 'PL', dialCode: '48', example: '512 345 678' },
  { iso: 'TR', dialCode: '90', example: '501 234 56 78' },
  { iso: 'IN', dialCode: '91', example: '81234 56789' },
  { iso: 'IL', dialCode: '972', example: '50-123-4567' },
  { iso: 'AE', dialCode: '971', example: '50 123 4567' },
  { iso: 'BR', dialCode: '55', example: '11 96123-4567' },
]

export const DEFAULT_COUNTRY_ISO = 'RU'

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0]
}

export function countryLabel(iso: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(iso) ?? iso
  } catch {
    return iso
  }
}
