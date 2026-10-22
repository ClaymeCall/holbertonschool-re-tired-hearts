import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import CityField from '../components/CityField.vue'
import * as places from '../services/places'

vi.mock('../services/places')

const lyon = { name: 'Lyon', postalCode: '69001' }
const lyonnais = { name: 'Lyon-en-Val', postalCode: '45240' }

let wrapper
function mountField(modelValue = '') {
  wrapper = mount(CityField, {
    props: { id: 'city', label: 'Ville', modelValue, 'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }) },
    attachTo: document.body,
  })
}
const input = () => wrapper.get('input')
async function type(text) {
  await input().setValue(text)
  await vi.advanceTimersByTimeAsync(350)
  await flushPromises()
}

describe('CityField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    places.searchPlaces.mockResolvedValue({ available: true, suggestions: [lyon, lyonnais] })
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('propose des communes après deux caractères, sans interroger avant', async () => {
    mountField()
    await type('l')
    expect(places.searchPlaces).not.toHaveBeenCalled()
    await type('ly')
    expect(places.searchPlaces).toHaveBeenCalledWith('ly')
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['Lyon (69001)', 'Lyon-en-Val (45240)'])
    expect(input().attributes('aria-expanded')).toBe('true')
  })

  it('attend la fin de la frappe avant d\'appeler le service', async () => {
    mountField()
    await input().setValue('ly')
    await input().setValue('lyo')
    await vi.advanceTimersByTimeAsync(350)
    expect(places.searchPlaces).toHaveBeenCalledTimes(1)
    expect(places.searchPlaces).toHaveBeenCalledWith('lyo')
  })

  it('remplit le champ avec le nom de la commune choisie, sans le code postal', async () => {
    mountField()
    await type('ly')
    await wrapper.findAll('[role="option"]')[0].trigger('click')
    expect(input().element.value).toBe('Lyon')
    expect(input().attributes('aria-expanded')).toBe('false')
  })

  it('se pilote au clavier : flèches, Entrée pour choisir, Échap pour fermer', async () => {
    mountField()
    await type('ly')
    await input().trigger('keydown', { key: 'ArrowDown' })
    await input().trigger('keydown', { key: 'ArrowDown' })
    expect(input().attributes('aria-activedescendant')).toBe('city-option-1')
    await input().trigger('keydown', { key: 'Enter' })
    expect(input().element.value).toBe('Lyon-en-Val')

    await type('lyo')
    expect(input().attributes('aria-expanded')).toBe('true')
    await input().trigger('keydown', { key: 'Escape' })
    expect(input().attributes('aria-expanded')).toBe('false')
  })

  it('laisse la saisie libre et prévient quand le service est indisponible', async () => {
    places.searchPlaces.mockResolvedValue({ available: false, suggestions: [] })
    mountField()
    await type('ly')
    expect(wrapper.text()).toContain('indisponibles')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    await input().setValue('Lyon')
    expect(input().element.value).toBe('Lyon')
  })

  it('traite une erreur réseau comme un service indisponible', async () => {
    places.searchPlaces.mockRejectedValue(new Error('x'))
    mountField()
    await type('ly')
    expect(wrapper.text()).toContain('indisponibles')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    vi.useRealTimers()
    mountField()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
