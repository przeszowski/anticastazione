<template>
  <div class="flex min-h-screen bg-default">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content -->
    <div class="flex flex-col flex-1 min-w-0" style="margin-left: 220px;">
      <slot />
    </div>
  </div>
</template>
