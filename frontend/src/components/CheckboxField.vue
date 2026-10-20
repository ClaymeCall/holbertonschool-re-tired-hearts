<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label :for="id" class="flex min-h-12 cursor-pointer items-center gap-4 text-lg text-ink">
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      class="h-7 w-7 shrink-0 accent-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span>{{ label }}</span>
  </label>
</template>
