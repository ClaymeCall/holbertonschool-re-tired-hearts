# External API: municipality suggestions

One third-party API is used: it helps a member type a place (profile location, event filter) without spelling mistakes. The location filter of the events list compares plain text, so a typo makes it useless.

## Provider

| | |
|---|---|
| Provider | `geo.api.gouv.fr`, the official French municipality directory (État français) |
| Endpoint | `GET https://geo.api.gouv.fr/communes?nom=<text>&fields=nom,codesPostaux&boost=population&limit=8` |
| API key | none: the service is free and needs no account, so there is no secret to store |
| Usage limit | about 50 requests per second per IP (provider documentation), far above what the MVP needs |
| Where it is called | the NestJS backend only, never the browser |

## Our route

`GET /v1/places/search?q=lyo` (member, 2 to 60 characters)

```json
{ "available": true, "suggestions": [{ "name": "Lyon", "postalCode": "69001" }] }
```

- `postalCode` is the first postal code of the municipality (a large city has several); it only tells two homonymous municipalities apart. The value stored in the profile or used as a filter is the `name`.
- At most 8 suggestions. Entries that do not have the expected shape are skipped.

## Fallback behavior

The route never fails because of the provider. It answers `200` with `{ "available": false, "suggestions": [] }` when the provider:

- does not answer within 2 seconds (timeout),
- is unreachable or answers an error status (4xx, 5xx),
- answers something that is not a JSON list.

When `available` is `false`, the front end keeps the plain text input: typing a location by hand always works, so no essential action depends on the provider. `available: true` with an empty list simply means "no match".

Successful answers are cached in memory for 5 minutes (500 entries at most, case-insensitive), which limits the calls to the provider. Failures are never cached: the next keystroke tries again.

## Privacy

- Only the text the member typed is sent to the provider, from our server: no account id, no cookie, and the member's IP address is not exposed to it.
- The typed text is not written to the logs; a failure logs only its reason (timeout, HTTP status).
- The suggestions contain public data (municipality names), nothing about members.

## Limits

- No rate limit of our own on the route (it is member-only and cached); add one if abuse appears.
- The cache lives in the memory of one backend process and is emptied at each restart.
- Municipalities of metropolitan and overseas France only; a foreign city is typed by hand.

## Trying it

```bash
# after logging in on Swagger (/v1/docs), or with a cookie:
curl -b cookies.txt 'http://localhost:3000/v1/places/search?q=lyo'
```

To see the fallback, cut the network of the backend container (or stub `fetch` as the tests do): the answer becomes `{ "available": false, "suggestions": [] }`.
