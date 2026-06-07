<template>
  <!-- Layout aplikacji mobilnej dla pracowników — bez sidebara panelu. -->
  <div class="min-h-screen w-full flex justify-center" style="background:#f5f0e8;">
    <div class="w-full max-w-[430px] min-h-screen flex flex-col">
      <slot />
    </div>
  </div>
</template>
