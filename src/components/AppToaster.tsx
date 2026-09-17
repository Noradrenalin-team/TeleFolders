import { useStore } from '@tanstack/react-store'
import { Toaster } from 'sonner'
import { themeStore } from '#/stores/theme'

export function AppToaster() {
  const theme = useStore(themeStore)
  return <Toaster richColors closeButton theme={theme} />
}
