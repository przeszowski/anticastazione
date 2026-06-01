<script setup lang="ts">
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) {
    navigateTo('/raporty', { replace: true })
  } else {
    navigateTo('/login', { replace: true })
  }
})
</script>

<template>
  <div />
</template>
