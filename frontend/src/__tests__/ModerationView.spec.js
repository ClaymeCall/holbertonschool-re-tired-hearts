import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import ModerationView from '../views/ModerationView.vue'
import { ApiError } from '../services/api'
import * as events from '../services/events'
import * as moderation from '../services/moderation'

vi.mock('../services/events')
vi.mock('../services/moderation')

const profile = (id, name, extra = {}) => ({ id, displayName: name, approximateLocation: 'Lyon', bio: null, ...extra })
const event = { id: 5, title: 'Randonnée', startsAt: '2026-11-02T14:00:00.000Z', approximateLocation: 'Lyon', registeredCount: 4, organizer: { id: 2, displayName: 'Colette' } }

let wrapper
async function mountView() {
  wrapper = mount(ModerationView, { attachTo: document.body })
  await flushPromises()
}
const tab = (label) => wrapper.findAll('[role="tab"]').find((t) => t.text().includes(label))
const button = (label) => wrapper.findAll('button').find((b) => b.text().includes(label))
const dialog = () => document.body.querySelector('[role="alertdialog"], [role="dialog"]')
const confirmButton = (label) => [...document.body.querySelectorAll('button')].find((b) => b.textContent.includes(label))

describe('ModerationView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    moderation.listProfilesByStatus.mockImplementation(async (status) =>
      status === 'pending' ? [profile(1, 'Jeanne')] : status === 'approved' ? [profile(2, 'Paul')] : [profile(3, 'Marc')],
    )
    moderation.listActions.mockResolvedValue([
      { id: 1, moderatorId: 9, targetType: 'profile', targetId: 1, action: 'approve_profile', reason: 'ok', createdAt: '2026-10-21T10:00:00.000Z' },
    ])
    events.listEvents.mockResolvedValue({ items: [event], total: 1, page: 1, limit: 50 })
    for (const name of ['approveProfile', 'blockProfile', 'unblockProfile', 'cancelEventAsModerator']) {
      moderation[name].mockResolvedValue({})
    }
  })
  afterEach(() => wrapper?.unmount())

  it('affiche les profils en attente et permet de les approuver sans confirmation', async () => {
    await mountView()
    expect(wrapper.text()).toContain('Jeanne')
    await button('Approuver le profil').trigger('click')
    await flushPromises()
    expect(moderation.approveProfile).toHaveBeenCalledWith(1)
    expect(wrapper.get('[role="status"], [role="alert"]').text()).toBeTruthy()
    expect(wrapper.text()).toContain('Le profil de Jeanne est approuvé.')
  })

  it('demande confirmation en nommant la cible avant de bloquer un profil', async () => {
    await mountView()
    await tab('approuvés').trigger('click')
    await flushPromises()
    await button('Bloquer le profil').trigger('click')
    expect(moderation.blockProfile).not.toHaveBeenCalled()
    expect(dialog().textContent).toContain('Bloquer le profil de Paul ?')
    confirmButton('Oui, bloquer le profil').click()
    await flushPromises()
    expect(moderation.blockProfile).toHaveBeenCalledWith(2)
  })

  it('ne fait rien quand on retourne en arrière dans la confirmation', async () => {
    await mountView()
    await tab('approuvés').trigger('click')
    await flushPromises()
    await button('Bloquer le profil').trigger('click')
    confirmButton('Retour').click()
    await flushPromises()
    expect(moderation.blockProfile).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('débloque un profil bloqué', async () => {
    await mountView()
    await tab('bloqués').trigger('click')
    await flushPromises()
    await button('Débloquer le profil').trigger('click')
    await flushPromises()
    expect(moderation.unblockProfile).toHaveBeenCalledWith(3)
  })

  it('annule une sortie publiée après confirmation nommant la sortie et son organisateur', async () => {
    await mountView()
    await tab('Sorties').trigger('click')
    await flushPromises()
    await button('Annuler la sortie').trigger('click')
    expect(dialog().textContent).toContain('Annuler la sortie « Randonnée » ?')
    expect(dialog().textContent).toContain('Colette')
    confirmButton('Oui, annuler la sortie').click()
    await flushPromises()
    expect(moderation.cancelEventAsModerator).toHaveBeenCalledWith(5)
  })

  it('affiche l\'historique des actions', async () => {
    await mountView()
    await tab('Historique').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Profil approuvé')
    expect(wrapper.text()).toContain('Motif : ok')
  })

  it('explique un conflit (409) et recharge la liste', async () => {
    moderation.approveProfile.mockRejectedValue(new ApiError(409, 'x'))
    await mountView()
    await button('Approuver le profil').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Action impossible')
    expect(moderation.listProfilesByStatus).toHaveBeenCalledTimes(2)
  })

  it('explique un refus (403) sans prétendre que la personne n\'est pas modératrice', async () => {
    moderation.approveProfile.mockRejectedValue(new ApiError(403, 'x'))
    await mountView()
    await button('Approuver le profil').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('ni celui d’un autre modérateur')
  })

  it('propose de réessayer si le chargement échoue', async () => {
    moderation.listProfilesByStatus.mockRejectedValue(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
    expect(button('Réessayer')).toBeTruthy()
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
