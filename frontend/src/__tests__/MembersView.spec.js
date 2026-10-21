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

  it('liste les membres avec un lien vers leur profil', async () => {
    await mountView()
    expect(wrapper.text()).toContain('2 membres')
    const links = wrapper.findAll('a').filter((a) => a.text().startsWith('Voir le profil'))
    expect(links.map((a) => a.attributes('href'))).toEqual(['/people/2?from=members', '/people/103?from=members'])
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
