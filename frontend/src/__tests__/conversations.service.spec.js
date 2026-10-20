import { describe, it, expect } from 'vitest'
import { getMessages, listConversations, markRead, sendMessage } from '../services/conversations'

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

  it('refuse un message vide ou de plus de 1000 caractères', async () => {
    await expect(sendMessage(2, '   ')).rejects.toMatchObject({ status: 400 })
    await expect(sendMessage(2, 'a'.repeat(1001))).rejects.toMatchObject({ status: 400 })
  })

  it('refuse d\'écrire à une personne jamais rencontrée (profil inaccessible)', async () => {
    await expect(sendMessage(9999, 'Bonjour')).rejects.toMatchObject({ status: 404 })
    await expect(getMessages(9999)).rejects.toMatchObject({ status: 404 })
  })
})
