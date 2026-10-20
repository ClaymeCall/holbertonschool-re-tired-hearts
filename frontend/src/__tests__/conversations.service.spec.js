import { describe, it, expect } from 'vitest'
import { getMessages, listConversations, markRead, sendMessage } from '../services/conversations'
import { updateMyProfile } from '../services/profile'

describe('messagerie (règles simulées)', () => {
  it('liste les conversations avec le nombre de messages non lus', async () => {
    const list = await listConversations()
    const colette = list.find((item) => item.person.id === 2)
    expect(colette.unreadCount).toBeGreaterThan(0)
    expect(list.map((item) => item.person.id)).toContain(105)
  })

  it('marque les messages comme lus', async () => {
    await markRead(105)
    const list = await listConversations()
    expect(list.find((item) => item.person.id === 105).unreadCount).toBe(0)
  })

  it('envoie un message à une personne rencontrée', async () => {
    const before = (await getMessages(2)).length
    const sent = await sendMessage(2, '  Bonjour Colette  ')
    expect(sent).toMatchObject({ content: 'Bonjour Colette', fromMe: true })
    expect((await getMessages(2)).length).toBe(before + 1)
  })

  it('refuse d\'écrire à une personne qui n\'accepte pas les messages (403)', async () => {
    await expect(sendMessage(113, 'Bonjour')).rejects.toMatchObject({ status: 403 })
  })

  it('refuse d\'écrire quand j\'ai moi-même désactivé les messages, et rétablit l\'envoi ensuite', async () => {
    await updateMyProfile({ messaging_enabled: false })
    await expect(sendMessage(2, 'Bonjour')).rejects.toMatchObject({ status: 403 })
    await updateMyProfile({ messaging_enabled: true })
    await expect(sendMessage(2, 'Bonjour')).resolves.toMatchObject({ fromMe: true })
  })

  it('refuse un message vide ou de plus de 1000 caractères', async () => {
    await expect(sendMessage(2, '   ')).rejects.toMatchObject({ status: 400 })
    await expect(sendMessage(2, 'a'.repeat(1001))).rejects.toMatchObject({ status: 400 })
  })

  it('refuse d\'écrire à un membre sans sortie en commun et qui n\'organise rien (403)', async () => {
    await expect(sendMessage(107, 'Bonjour')).rejects.toMatchObject({ status: 403 })
  })

  it('répond 404 pour une personne qui n\'existe pas', async () => {
    await expect(sendMessage(9999, 'Bonjour')).rejects.toMatchObject({ status: 404 })
    await expect(getMessages(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('permet de lire un historique vide avec un membre jamais rencontré', async () => {
    await expect(getMessages(107)).resolves.toEqual([])
  })
})
