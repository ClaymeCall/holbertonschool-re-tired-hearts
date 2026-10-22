import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import MembersView from '../views/MembersView.vue'
import * as people from '../services/people'
import * as events from '../services/events'

vi.mock('../services/people')
vi.mock('../services/events')

const member = (id, displayName, approximateLocation = 'Lyon') => ({ id, displayName, approximateLocation, interests: [{ id: 1, name: 'Randonnée' }] })

let wrapper
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/members', name: 'members', component: MembersView },
      { path: '/people/:userId', name: 'person', component: { template: '<div />' } },
    ],
  })
  wrapper = mount(MembersView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

describe('MembersView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    events.listInterests.mockResolvedValue([{ id: 1, name: 'Randonnée' }])
    people.searchPeople.mockResolvedValue([member(2, 'Colette'), member(103, 'Henri')])
  })
  afterEach(() => wrapper?.unmount())

  it('affiche une carte par membre avec son nom, sa ville et ses centres d\'intérêt', async () => {
    await mountView()
    expect(wrapper.text()).toContain('2 membres')
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('Colette')
    expect(wrapper.text()).toContain('Randonnée')
  })

  it('ouvre une modale avec le portrait et le profil du membre choisi, puis la ferme', async () => {
    await mountView()
    const open = wrapper.findAll('button').filter((b) => b.text().startsWith('Voir le profil'))
    await open[1].trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Henri')
    expect(dialog.find('img').exists()).toBe(true)
    const link = dialog.findAll('a').find((a) => a.text().includes('Voir la page'))
    expect(link.attributes('href')).toBe('/people/103?from=members')
    await dialog.find('[data-close]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('ferme la modale avec Échap', async () => {
    await mountView()
    await wrapper.findAll('button').find((b) => b.text().startsWith('Voir le profil')).trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('pagine par 12 : numéros de page, précédent et suivant', async () => {
    people.searchPeople.mockResolvedValue(Array.from({ length: 30 }, (_, i) => member(i + 1, `Membre ${i + 1}`)))
    await mountView()
    expect(wrapper.findAll('article')).toHaveLength(12)
    expect(wrapper.text()).toContain('Page 1 sur 3 · 30 membres')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('1')
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(6)
    expect(wrapper.text()).toContain('Membre 25')
    expect(wrapper.text()).not.toContain('Membre 1 ')
    await wrapper.findAll('button').find((b) => b.text().includes('Précédent')).trigger('click')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('2')
    expect(wrapper.findAll('button').find((b) => b.text().includes('Suivant')).attributes('disabled')).toBeUndefined()
  })

  it('n\'affiche pas de pagination pour une seule page et revient page 1 après une recherche', async () => {
    await mountView()
    expect(wrapper.find('nav[aria-label="Pagination"]').exists()).toBe(false)
    people.searchPeople.mockResolvedValue(Array.from({ length: 30 }, (_, i) => member(i + 1, `Membre ${i + 1}`)))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[aria-current="page"]').text()).toBe('1')
  })

  it('lance la recherche avec le prénom ou la ville et le centre d\'intérêt', async () => {
    await mountView()
    await wrapper.get('#search').setValue('lyon')
    await wrapper.get('#member-interest').setValue('1')
    await wrapper.get('form').trigger('submit')
    expect(people.searchPeople).toHaveBeenLastCalledWith({ search: 'lyon', interest: '1' })
  })

  it('efface les critères', async () => {
    await mountView()
    await wrapper.get('#search').setValue('lyon')
    await wrapper.findAll('button').find((b) => b.text() === 'Effacer').trigger('click')
    expect(people.searchPeople).toHaveBeenLastCalledWith({ search: '', interest: '' })
  })

  it('affiche un message quand personne ne correspond', async () => {
    people.searchPeople.mockResolvedValue([])
    await mountView()
    expect(wrapper.text()).toContain('Aucun membre ne correspond')
  })

  it('propose de réessayer en cas d\'erreur', async () => {
    people.searchPeople.mockRejectedValueOnce(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
    await wrapper.findAll('button').find((b) => b.text() === 'Réessayer').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Henri')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
