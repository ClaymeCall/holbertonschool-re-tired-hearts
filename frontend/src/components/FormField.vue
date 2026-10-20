<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  multiline: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const fieldClasses =
  'mt-1 block w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-lg text-ink placeholder:text-muted aria-[invalid=true]:border-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
</script>

<template>
  <div>
    <label :for="id" class="block text-lg font-semibold text-ink">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="mt-1 text-base text-muted">{{ hint }}</p>
    <component
      :is="multiline ? 'textarea' : 'input'"
      :id="id"
      :type="multiline ? undefined : type"
      :rows="multiline ? 3 : undefined"
      :value="modelValue"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined"
      :class="fieldClasses"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" :id="`${id}-error`" class="mt-2 text-base font-semibold text-danger">{{ error }}</p>
  </div>
</template>
