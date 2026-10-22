import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import ModerationView from '../views/ModerationView.vue'
import { ApiError } from '../services/api'
import * as events from '../services/events'
import * as moderation from '../services/moderation'

vi.mock('../services/events')
vi.mock('../services/moderation')

const profile = (id, name, extra = {}) => ({ id, userId: id + 100, accountStatus: 'active', displayName: name, approximateLocation: 'Lyon', bio: null, ...extra })
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
    for (const name of ['approveProfile', 'blockProfile', 'unblockProfile', 'suspendAccount', 'reactivateAccount', 'cancelEventAsModerator']) {
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

  it('suspend un compte actif avec l\'id du compte (pas celui du profil), après confirmation', async () => {
    await mountView()
    expect(button('Réactiver le compte')).toBeUndefined()
    await button('Suspendre le compte').trigger('click')
    expect(dialog().textContent).toContain('Suspendre le compte de Jeanne ?')
    confirmButton('Oui, suspendre le compte').click()
    await flushPromises()
    expect(moderation.suspendAccount).toHaveBeenCalledWith(101)
  })

  it('propose seulement de réactiver un compte suspendu', async () => {
    moderation.listProfilesByStatus.mockResolvedValue([profile(1, 'Jeanne', { accountStatus: 'suspended' })])
    await mountView()
    expect(wrapper.text()).toContain('Compte suspendu')
    expect(button('Suspendre le compte')).toBeUndefined()
    await button('Réactiver le compte').trigger('click')
    await flushPromises()
    expect(moderation.reactivateAccount).toHaveBeenCalledWith(101)
  })

  it('filtre la liste par nom ou ville, sans tenir compte des accents ni de la casse', async () => {
    moderation.listProfilesByStatus.mockResolvedValue([profile(1, 'Éloïse', { approximateLocation: 'Lyon' }), profile(2, 'Paul', { approximateLocation: 'Nantes' })])
    await mountView()
    expect(wrapper.text()).toContain('Éloïse')
    await wrapper.get('#mod-search').setValue('eloise')
    expect(wrapper.text()).toContain('Éloïse')
    expect(wrapper.text()).not.toContain('Paul')
    expect(wrapper.text()).toContain('1 résultat(s)')
    await wrapper.get('#mod-search').setValue('nantes')
    expect(wrapper.text()).toContain('Paul')
    expect(wrapper.text()).not.toContain('Éloïse')
    await wrapper.get('#mod-search').setValue('zzz')
    expect(wrapper.text()).toContain('Aucun résultat pour « zzz »')
  })

  it('cherche une sortie par titre, ville ou organisateur et vide la recherche en changeant d\'onglet', async () => {
    await mountView()
    await tab('Sorties').trigger('click')
    await flushPromises()
    await wrapper.get('#mod-search').setValue('colette')
    expect(wrapper.text()).toContain('Randonnée')
    await wrapper.get('#mod-search').setValue('inconnu')
    expect(wrapper.text()).toContain('Aucun résultat')
    await tab('Historique').trigger('click')
    await flushPromises()
    expect(wrapper.get('#mod-search').element.value).toBe('')
  })

  it('charge toutes les pages de sorties pour que la recherche les couvre toutes', async () => {
    events.listEvents.mockImplementation(async ({ page }) => ({
      items: [{ ...event, id: page, title: `Sortie ${page}` }],
      total: 3,
      page,
      limit: 50,
    }))
    await mountView()
    await tab('Sorties').trigger('click')
    await flushPromises()
    expect(events.listEvents).toHaveBeenCalledTimes(3)
    expect(wrapper.text()).toContain('Sortie 3')
  })

  it('pagine les listes de modération par 12 et revient à la première page après une recherche', async () => {
    moderation.listProfilesByStatus.mockResolvedValue(Array.from({ length: 30 }, (_, i) => profile(i + 1, `Membre ${i + 1}`)))
    await mountView()
    expect(wrapper.findAll('article, li').filter((el) => el.text().includes('Approuver le profil'))).toHaveLength(12)
    expect(wrapper.text()).toContain('Page 1 sur 3 · 30 résultats')
    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('2')
    await wrapper.get('#mod-search').setValue('Membre 3')
    expect(wrapper.find('nav[aria-label="Pagination"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Membre 3')
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
