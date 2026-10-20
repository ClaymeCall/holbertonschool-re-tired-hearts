import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import axe from 'axe-core'
import ChatPanel from '../components/ChatPanel.vue'
import { ApiError } from '../services/api'
import * as chat from '../services/conversations'

vi.mock('../services/conversations')

const msg = (id, content, fromMe) => ({ id, content, fromMe, sentAt: new Date().toISOString() })

let wrapper
async function mountPanel() {
  wrapper = mount(ChatPanel, { props: { personId: 2, personName: 'Colette' }, global: { plugins: [createPinia()] }, attachTo: document.body })
  await flushPromises()
}
const send = () => wrapper.findAll('button').find((b) => b.text().startsWith('Envoy'))

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    chat.getMessages.mockResolvedValue([msg(1, 'Bonjour !', false), msg(2, 'Salut Colette', true)])
    chat.markRead.mockResolvedValue()
    chat.listConversations.mockResolvedValue([])
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('affiche la discussion et marque les messages comme lus', async () => {
    await mountPanel()
    expect(wrapper.text()).toContain('Bonjour !')
    expect(wrapper.text()).toContain('Salut Colette')
    expect(chat.markRead).toHaveBeenCalledWith(2)
  })

  it('invite à dire bonjour quand il n\'y a aucun message', async () => {
    chat.getMessages.mockResolvedValue([])
    await mountPanel()
    expect(wrapper.text()).toContain('Dites bonjour')
  })

  it('désactive l\'envoi tant que le message est vide et affiche le compteur', async () => {
    await mountPanel()
    expect(send().attributes('disabled')).toBeDefined()
    await wrapper.get('textarea').setValue('Bonjour')
    expect(send().attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('7/1000')
  })

  it('bloque un message de plus de 1000 caractères', async () => {
    await mountPanel()
    await wrapper.get('textarea').setValue('a'.repeat(1001))
    expect(send().attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('envoie le message, vide le champ et recharge la discussion', async () => {
    chat.sendMessage.mockResolvedValue(msg(3, 'À bientôt', true))
    await mountPanel()
    await wrapper.get('textarea').setValue('À bientôt')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(chat.sendMessage).toHaveBeenCalledWith(2, 'À bientôt')
    expect(wrapper.get('textarea').element.value).toBe('')
    expect(chat.getMessages).toHaveBeenCalledTimes(2)
  })

  it('explique que la personne n\'accepte pas de messages (403)', async () => {
    chat.sendMessage.mockRejectedValue(new ApiError(403, 'x'))
    await mountPanel()
    await wrapper.get('textarea').setValue('Bonjour')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('n’accepte pas de messages')
  })

  it('affiche les nouveaux messages au rafraîchissement automatique, sans WebSocket', async () => {
    vi.useFakeTimers()
    await mountPanel()
    chat.getMessages.mockResolvedValue([msg(1, 'Bonjour !', false), msg(2, 'Salut Colette', true), msg(3, 'Nouveau message', false)])
    await vi.advanceTimersByTimeAsync(10500)
    await flushPromises()
    expect(wrapper.text()).toContain('Nouveau message')
  })

  it('affiche les messages en texte, jamais en HTML', async () => {
    chat.getMessages.mockResolvedValue([msg(1, '<img src=x onerror=alert(1)> <b>gras</b>', false)])
    await mountPanel()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<b>gras</b>')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountPanel()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
