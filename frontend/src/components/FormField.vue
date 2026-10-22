<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  multiline: { type: Boolean, default: false },
  min: { type: [String, Number], default: undefined },
  compact: { type: Boolean, default: false },
  rows: { type: Number, default: 3 },
})
defineEmits(['update:modelValue'])

const ring = 'placeholder:text-muted aria-[invalid=true]:border-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
const fieldClasses = computed(() =>
  props.compact
    ? `mt-1 block min-h-11 w-full rounded-lg border-2 border-line bg-white px-3 py-2 text-base text-ink ${ring}`
    : `mt-1 block min-h-14 w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-lg text-ink ${ring}`,
)
const labelClasses = computed(() => (props.compact ? 'block text-sm font-bold text-ink' : 'block text-lg font-semibold text-ink'))
const hintClasses = computed(() => (props.compact ? 'mt-0.5 text-sm text-muted' : 'mt-1 text-base text-muted'))
</script>

<template>
  <div>
    <label :for="id" :class="labelClasses">{{ label }}</label>
    <p v-if="hint && !compact" :id="`${id}-hint`" :class="hintClasses">{{ hint }}</p>
    <component
      :is="multiline ? 'textarea' : 'input'"
      :id="id"
      :type="multiline ? undefined : type"
      :min="multiline ? undefined : min"
      :rows="multiline ? rows : undefined"
      :value="modelValue"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined"
      :class="fieldClasses"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="hint && compact" :id="`${id}-hint`" :class="hintClasses">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-sm font-semibold text-danger">{{ error }}</p>
  </div>
</template>
