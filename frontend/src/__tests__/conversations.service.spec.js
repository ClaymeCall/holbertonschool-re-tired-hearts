import { describe, it, expect, vi, afterEach } from 'vitest'
import { getMessages, getUnreadCount, listConversations, markRead, sendMessage } from '../services/conversations'

function stubFetch(status = 200, body = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const lastCall = (fetchMock) => ({ url: fetchMock.mock.calls[0][0], init: fetchMock.mock.calls[0][1] })

afterEach(() => vi.unstubAllGlobals())

describe('service de messagerie (routes /v1/conversations)', () => {
  it('liste les conversations et donne un nom aux personnes devenues indisponibles', async () => {
    stubFetch(200, [
      { person: { id: 2, displayName: null, approximateLocation: null, available: false }, lastMessage: {}, unreadCount: 1 },
    ])
    const [conversation] = await listConversations()
    expect(conversation.person.displayName).toBe('Un membre')
    expect(conversation.unreadCount).toBe(1)
  })

  it('lit l\'historique, marque comme lu et envoie un message', async () => {
    let fetchMock = stubFetch(200, [])
    await getMessages(5)
    expect(lastCall(fetchMock).url).toMatch(/\/v1\/conversations\/with\/5\/messages$/)

    fetchMock = stubFetch(204)
    await markRead(5)
    expect(lastCall(fetchMock).url).toMatch(/\/v1\/conversations\/with\/5\/read$/)
    expect(lastCall(fetchMock).init.method).toBe('POST')

    fetchMock = stubFetch(201, { id: 1 })
    await sendMessage(5, 'Bonjour')
    expect(lastCall(fetchMock).init).toMatchObject({ method: 'POST', body: JSON.stringify({ content: 'Bonjour' }) })
  })

  it('propage le refus du serveur (403)', async () => {
    stubFetch(403)
    await expect(sendMessage(5, 'Bonjour')).rejects.toMatchObject({ status: 403 })
  })

  it('renvoie le nombre de messages non lus', async () => {
    stubFetch(200, { unreadCount: 4 })
    expect(await getUnreadCount()).toBe(4)
  })
})
