import { z } from 'zod'

// Zod probes `new Function('')` for its JIT the first time an object schema
// is built. Our CSP has no 'unsafe-eval' (ТЗ §6.5), so the probe only ever
// fails — and the browser still reports it as a CSP violation even though
// Zod catches the error. Jitless mode skips the probe. It has to be set
// before any schema exists, hence schemas import `z` from here, not 'zod'.
z.config({ jitless: true })

export { z }
