<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  align?: 'left' | 'right'
}>(), {
  align: 'left'
})
</script>

<template>
  <div
    class="flex min-w-32 flex-col gap-1.5"
    :class="align === 'right' ? 'items-end text-right' : 'items-start text-left'"
    @click.stop
    @keydown.stop
  >
    <span class="text-xs font-medium text-muted">{{ label }}</span>
    <slot />
  </div>
</template>
