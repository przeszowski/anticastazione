<template>
  <!-- Layout aplikacji mobilnej dla pracowników — bez sidebara panelu. -->
  <div class="min-h-screen w-full flex justify-center" style="background:#faf6f0;">
    <div class="w-full max-w-md min-h-screen bg-default flex flex-col">
      <slot />
    </div>
  </div>
</template>
