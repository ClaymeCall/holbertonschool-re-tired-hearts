<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
})
defineEmits(['update:modelValue'])

const fieldClasses =
  'mt-1 block min-h-14 w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-lg text-ink aria-[invalid=true]:border-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
</script>

<template>
  <div>
    <label :for="id" class="block text-lg font-semibold text-ink">{{ label }}</label>
    <select
      :id="id"
      :value="modelValue"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
      :class="fieldClasses"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <p v-if="error" :id="`${id}-error`" class="mt-2 text-base font-semibold text-danger">{{ error }}</p>
  </div>
</template>
