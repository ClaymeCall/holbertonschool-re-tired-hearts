// Simulation : GET/PATCH /v1/profiles/me ne sont pas encore implémentées.
// Champs issus de docs/data-model.md (Profile). Les intérêts viendront avec GET /v1/interests.
let current = { display_name: '', bio: '', approximate_location: '', messaging_enabled: true }

const delay = () => new Promise((resolve) => setTimeout(resolve, 400))

export async function getMyProfile() {
  await delay()
  return { ...current }
}

export async function updateMyProfile(data) {
  await delay()
  current = { ...current, ...data }
  return { ...current }
}
