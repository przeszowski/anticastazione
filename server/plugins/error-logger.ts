export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, context) => {
    console.error('[nitro]', context.event?.path ?? 'unknown route', error)
  })
})
