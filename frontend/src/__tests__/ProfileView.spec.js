import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import ProfileView from '../views/ProfileView.vue'
import { ApiError } from '../services/api'
import * as profile from '../services/profile'

vi.mock('../services/profile')

const base = { display_name: 'Jeanne', bio: '', approximate_location: 'Lyon' }

async function mountView() {
  const wrapper = mount(ProfileView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    profile.getMyProfile.mockResolvedValue({ ...base })
  })

  it('pré-remplit le formulaire avec le profil chargé', async () => {
    const wrapper = await mountView()
    expect(wrapper.get('#display_name').element.value).toBe('Jeanne')
  })

  it('affiche un formulaire vide, sans erreur, quand le profil n\'existe pas encore (404)', async () => {
    profile.getMyProfile.mockRejectedValue(new ApiError(404, 'x'))
    const wrapper = await mountView()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Vous n’avez pas encore de profil')
    expect(wrapper.get('#display_name').element.value).toBe('')
  })

  it('crée le profil au premier enregistrement puis n\'affiche plus l\'invitation', async () => {
    profile.getMyProfile.mockRejectedValue(new ApiError(404, 'x'))
    profile.updateMyProfile.mockResolvedValue({ ...base, display_name: 'Jeanne' })
    const wrapper = await mountView()
    await wrapper.get('#display_name').setValue('Jeanne')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(profile.updateMyProfile).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Votre profil a été enregistré.')
    expect(wrapper.text()).not.toContain('Vous n’avez pas encore de profil')
  })

  it('propose de réessayer si le chargement échoue', async () => {
    profile.getMyProfile.mockRejectedValue(new Error('x'))
    const wrapper = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
  })

  it('exige un nom affiché', async () => {
    const wrapper = await mountView()
    await wrapper.get('#display_name').setValue('  ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Saisissez le nom affiché')
    expect(profile.updateMyProfile).not.toHaveBeenCalled()
  })

  it('enregistre et confirme', async () => {
    profile.updateMyProfile.mockResolvedValue({ ...base, display_name: 'Jeanne D' })
    const wrapper = await mountView()
    await wrapper.get('#display_name').setValue('Jeanne D')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(profile.updateMyProfile).toHaveBeenCalledWith({ ...base, display_name: 'Jeanne D' })
    expect(wrapper.text()).toContain('Votre profil a été enregistré.')
  })

  it('affiche un message sûr si l\'enregistrement échoue', async () => {
    profile.updateMyProfile.mockRejectedValue(new ApiError(500, 'x'))
    const wrapper = await mountView()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Enregistrement impossible')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const wrapper = await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
