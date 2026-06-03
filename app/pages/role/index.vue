<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { roles, loading, error, fetch } = useRoles()
const { can } = useAuth()

onMounted(fetch)

// Grupowanie uprawnień: moduły (module:x) osobno od akcji (x:akcja)
function moduly(perms: string[]) {
  return perms.filter(p => p.startsWith('module:')).map(p => p.replace('module:', ''))
}
function akcje(perms: string[]) {
  return perms.filter(p => !p.startsWith('module:'))
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Role systemowe</span>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" />

      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
      </div>

      <div
        v-for="rola in roles"
        v-else
        :key="rola.id"
        class="border border-muted rounded-xl p-5 bg-default"
      >
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base font-semibold">{{ rola.nazwa }}</span>
          <UBadge v-if="rola.systemowa" color="neutral" variant="subtle" size="sm">Systemowa</UBadge>
          <span class="ml-auto text-xs text-muted">{{ rola.permissions.length }} uprawnień</span>
        </div>

        <p v-if="rola.opis" class="text-sm text-muted mb-3">{{ rola.opis }}</p>

        <div class="flex flex-col gap-2">
          <div>
            <div class="text-xs text-muted mb-1.5">Moduły</div>
            <div class="flex flex-wrap gap-1.5">
              <UBadge
                v-for="m in moduly(rola.permissions)"
                :key="m"
                color="primary"
                variant="subtle"
                size="sm"
              >{{ m }}</UBadge>
              <span v-if="moduly(rola.permissions).length === 0" class="text-xs text-muted">—</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1.5">Uprawnienia</div>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="a in akcje(rola.permissions)"
                :key="a"
                color="neutral"
                variant="subtle"
                size="sm"
              >{{ a }}</UBadge>
              <span v-if="akcje(rola.permissions).length === 0" class="text-xs text-muted">—</span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!loading && roles.length === 0" class="text-sm text-muted text-center py-8">
        Brak ról.
      </p>
    </div>
  </div>
</template>
