## Description

Re-Tired Hearts is a fictional service created by Happy Retired, a company that supports active people over 60. The platform is designed to make it easier to meet people with similar interests, first online and then in safe local settings.

The target audience may be looking for friendship, companionship, romance or simply new activities after retirement. Many users will value clarity, trust and human-sized interactions more than a large number of complex features. The interface must therefore avoid unnecessary friction, use readable content and make important actions easy to find.

This is an educational full-stack project for a team of two or three students. The expected workload is approximately 35 hours per student during one week. The team must demonstrate its ability to design, build, secure, test, containerize and present a complete MVP with NestJS, Vue.js and PostgreSQL.

## Scenario: A new chapter

Happy Retired has validated the idea but has no reliable product to present to its first community partners. The company wants a focused MVP that lets members create a trustworthy profile, discover local events, register for an activity and continue a conversation privately afterwards.

The team must balance social features with safety. Profile information and messages are personal data. Exact addresses must not be exposed unnecessarily, moderation actions must be protected and users must receive understandable feedback when an account or event is unavailable.

The first release is not expected to provide an advanced matching algorithm, real-time chat, a mobile application or a complete reporting workflow. The priority is a stable foundation that can be explained and extended later.

## Product mission

Your team must turn this product idea into a complete, usable and defensible MVP. The main journey should allow a member to create an account, complete a profile, discover a local event, register for it and exchange private messages with an eligible member, such as another participant in the same event or the event organizer. The journey must be available through the Vue.js interface, not only through isolated API calls or direct database operations.

The product must make safety visible. Organizers need controlled event-management capabilities, moderators need a protected back-office, and ordinary members must only access the profiles, events and conversations allowed by the business rules. Define event capacity, approximate location display, contact rules, profile publication rules and blocked-account behavior, then apply them consistently in the API, database and interface.

The MVP is a learning project, not a production dating service. Focus on a coherent vertical slice, reliable data handling, privacy protections and an implementation every team member can explain during the oral evaluation.

## Product expectations

### A welcoming and readable interface

The service targets people over 60 with different levels of digital confidence. Use familiar wording, visible labels, readable text, clear focus states and predictable navigation. Important actions such as editing a profile, joining an event, sending a message or signing out must be easy to locate. The responsive layout must work on desktop and mobile screens without making forms, event cards, conversations or moderation screens difficult to use.

### A clear social journey

A member should understand what information is public, what is visible only to authenticated users and what remains private. Members should be able to discover other approved member profiles. These profiles should present interests and an approximate location without exposing unnecessary personal details. Only authenticated members can browse profiles, and private information must remain protected. Event pages must make the date, location, organizer, available places and registration status easy to understand. Messaging must identify the other participant, show messages chronologically and distinguish loading, empty, success and failure states.

### Safe, reliable and accessible behavior

Protect accounts with secure authentication, safe password storage, server-side validation and authorization on every protected resource. Users must not access another person&#39;s private profile information, event registrations or conversations by changing an identifier in a URL or request. Profile information shared with authenticated members must remain accessible only according to the defined privacy and moderation rules. User-controlled text must be rendered safely, and errors must not expose technical details. Guide users when forms are invalid, events are full or cancelled, profiles are unavailable or sessions expire. Apply WCAG practices to labels, keyboard navigation, focus, contrast, status and error messages.

### Reproducible and explainable delivery

Another team must be able to clone the repository, configure the environment, start NestJS, Vue.js and PostgreSQL with Docker Compose, apply migrations and reach a demonstration state. The README must explain scripts, variables, tests, seed or reset procedures, accounts and limitations. During the presentation, students should connect each feature to its route, validation rule, database operation and interface component, and demonstrate both successful and rejected requests.

Build a simple and respectful social platform where a member can move from account creation to profile discovery, local event participation and private asynchronous conversation. Organizers and moderators must have clearly separated permissions, while the interface must remain usable for the intended audience.

## Product boundaries

The MVP covers accounts, profiles, interests, approximate location, events, event registrations, asynchronous private messages and basic moderation. It does not require real-time WebSockets, advanced matching, public exact addresses, email campaigns, native mobile development or automated content classification.

The project must remain achievable for two or three students in approximately 35 hours per student over one week. Authentication, authorization, persistence, tests and moderator access rules may not be skipped. PostgreSQL is the source of truth and schema changes must be versioned through migrations. The team must also integrate one useful third-party API, such as a city lookup or geocoding service. The integration must provide a clear benefit to the application, handle timeouts and failures, and allow the core application to remain usable if the external service is unavailable. Payments and financial features are outside the project.

Age and identity verification are not required for this educational MVP. The application is designed for users over 60, but implementing a formal identity verification process is outside the project scope.

## Team and evaluation

The project is mandatory group work for two or three students. Three students are preferred when possible, with two as the minimum. Responsibilities may be distributed, but every member must understand the global architecture and be able to explain a meaningful part of the implementation during the oral evaluation.

## Resources

- [NestJS](/rltoken/BDlkDNKjz1ODbBN8Vo5mnw)
- [Vue.js](/rltoken/BPSMIWHk3T9owlCp1wvAOw)
- [PostgreSQL](/rltoken/uzMXCuUJKgV-VS6R2u-Pog)
- [OWASP Top 10](/rltoken/I6hoC62J64jaLyFIpULBOQ)
- [WCAG](/rltoken/nMERY43wKJfJfzB21hcu2w)
- [DisonsDemain](/rltoken/w3Qczt6uISXBIi96NnSrXQ) and [Parship](/rltoken/QQz9lD34cscjgS19ZysYzA) as interface inspiration</div></div>

## Context

Re-Tired Hearts is a one-week group project with several connected areas: identity, profiles, events, messaging and moderation. Without an agreed scope and shared contracts, the team may build incompatible screens, duplicate database logic or spend its time on features outside the MVP.

## Your mission

Form a team of three whenever possible, or at least two students when three are unavailable, then turn the brief into a shared technical plan. Establish the repository workflow, data model, API boundaries and a minimal runnable foundation that every member can use.

The outcome must be concrete enough to guide implementation during the rest of the week. Your team should be able to explain which decisions are fixed for the MVP, which ones are deliberately simplified and how a feature moves through Vue, NestJS and PostgreSQL.

## Steps

1. Register the team members, roles, availability and working agreement.
2. Define the MVP user journeys and explicitly record excluded features.
3. Design User, Profile, Interest, ProfileInterest, Event, EventRegistration, Conversation, Message and ModerationAction entities. Each event must be linked to one main interest through a foreign key, allowing members to filter events by interest. Create a database diagram showing their relationships, cardinalities, primary keys and foreign keys.
4. Decide how interests, approximate locations, event ownership and moderation states are represented. Define profile visibility rules, event capacity and lifecycle states, conversation eligibility rules and how member, organizer and moderator roles are assigned. Roles with elevated permissions must never be self-assigned during registration. Organizers retain standard member permissions and can register for events organized by other users, but not for their own events. Moderator permissions do not automatically grant event creation rights.
5. Define API routes, request and response shapes, permissions and error cases. Document the main contracts using OpenAPI/Swagger or a structured API document.
6. Choose NestJS modules, Vue structure, PostgreSQL access, migrations and testing tools.
7. Initialize the NestJS API, Vue application and PostgreSQL service.
8. Create the initial migration and one working API route and Vue screen.
9. Document local setup, branch naming, commit conventions and how a blank database is recreated.
10. Document a short risk register in `docs/architecture.md`, covering privacy, impersonation, unwanted contact, moderation and availability.

## Success criteria

The task is complete when:

- the team contains two or three students, with three preferred whenever possible;
- the MVP scope and excluded features are written and understood by every member;
- responsibilities, branch rules, commit conventions and collaboration expectations are documented;
- the main entities, relationships, cardinalities, primary keys, foreign keys, ownership rules and moderation states are represented in a data model;
- profile visibility, event capacity, event lifecycle, conversation eligibility and role-assignment rules are documented before implementation;
- the first API contracts include inputs, outputs, permissions and relevant errors;
- versioned migrations can create the database from an empty PostgreSQL instance;
- the NestJS API, Vue application and PostgreSQL service start locally;
- the first API route and Vue screen can be demonstrated;
- the risk register identifies privacy, impersonation, unwanted contact and moderation concerns.</div></div>

## Context

The platform contains personal profiles and private conversations. Users need a trustworthy identity boundary before they can create events, register for activities or contact another member. The profile must also be approachable for people who may not be comfortable with complex digital forms.

## Your mission

Implement the identity and profile foundation: account creation, login, logout, protected access and editable member information. Make the authorization rules reusable by all later modules and avoid exposing more personal information than the product needs.

The profile is not a public directory of private lives. Decide which fields are required, which are optional, who can see them and how a member can correct or remove them. Keep the first version intentionally simple: profile discovery can use approved, approximate information rather than a complex matching engine.

## Steps

1. Create or extend versioned PostgreSQL migrations for users, profiles, interests and their relationships, reusing the initial database structure from `Task 0`. Include an account status (active, suspended), defaulting to active, to support the authorization rules implemented in later tasks.
2. Implement registration, login, logout and current-user routes in NestJS.
3. Hash passwords securely and document the chosen session or token strategy, including logout, session or token expiration, and how account restrictions are checked on protected API requests.
4. Add profile fields, interest selection, privacy choices and approximate location. Separate private information from information visible to other authenticated members. Include a profile moderation status (`pending`, `approved`, `blocked`) to control visibility. Newly created profiles must not become discoverable until approved. Provide an initial moderator account through a controlled seed or a documented secure approval procedure, so that profile approval and discovery can be tested before the moderation interface is implemented in `Task 4`.
5. Protect member-only routes and distinguish member, organizer and moderator permissions. New accounts must receive the member role by default. Organizer and moderator roles must only be assigned through a controlled process, such as a database seed or authorized administrative action, never through public registration or profile editing.
6. Build Vue forms with clear labels, validation, loading, error and success states. Add a simple member discovery page where authenticated users can browse approved profiles and view their allowed information.
7. Add API tests and at least one Vue test for registration, login or profile editing. Include authorization tests verifying that private profile data remains protected and that users cannot assign themselves elevated roles.
8. Demonstrate the behavior of an anonymous request, an invalid credential, a member editing their own profile and an authenticated member discovering another approved profile.

## Success criteria

The task is complete when:

- a new member can register with valid information and receives useful validation feedback;
- invalid, duplicate or incomplete account data is rejected safely;
- login, logout and session expiration behave predictably;
- passwords are never stored or returned in plain text;
- anonymous users cannot access protected member routes;
- a member can view and edit their own complete profile but cannot modify another member&#39;s profile;
- authenticated members can discover approved profiles without accessing private information;
- pending or blocked profiles are not displayed in member discovery;
- interests and approximate location are handled according to the documented privacy rule;
- member, organizer and moderator permissions are distinguishable, and elevated roles cannot be self-assigned;
- the authentication, profile and discovery interfaces are usable with keyboard navigation and on small screens;
- API tests and a Vue test cover meaningful authentication, profile or authorization behavior.</div></div>

## Context

Re-Tired Hearts should help members turn an online introduction into a real, local activity. Events need enough structure to be searchable and understandable, while location information must remain proportionate and event ownership must be enforced.

## Your mission

Build the event journey from creation to participation. Members should be able to discover suitable events, understand the essential details and register or withdraw without creating inconsistent records. Authorized organizers must be able to manage their own events.

Apply the business rules agreed in Task 0: each event must have a positive capacity, only published future events can accept registrations, and organizers cannot register for their own events. Cancelled and past events must remain understandable but cannot accept new registrations. Prefer clear labels and a small number of filters over a complicated search engine.

## Steps

1. Create or extend versioned PostgreSQL migrations for events and event registrations, reusing the data model from `Task 0`. Add appropriate foreign keys and a unique constraint preventing duplicate registrations for the same member and event. Each registration must have a status (`registered`, `withdrawn`). Withdrawing must update the existing registration, and registering again must reactivate that registration rather than create a duplicate record. Only `registered` entries count toward event capacity.
2. Implement event creation, listing, detail, update, cancellation and deletion routes. Use clear lifecycle states (`draft`, `published`, `cancelled`, `completed`). Draft events are only visible to their organizer and authorized moderators. Published events can be discovered by members. Cancelled and completed events must remain accessible to their registered participants, organizer and authorized moderators, subject to account permissions, with their status clearly displayed. Organizers may mark past events as completed; automatic scheduling is not required for the MVP. Only draft events without registrations may be permanently deleted; published events must be cancelled to preserve their history.
3. Support filtering by interest and approximate location (such as a city) without exposing exact private addresses.
4. Prevent duplicate registrations and enforce capacity limits. Only published future events with available places can accept registrations. Members must be able to withdraw, freeing a place, and register again if capacity permits. Use a database transaction with appropriate locking, or another atomic mechanism, to ensure simultaneous registrations cannot exceed event capacity. Organizers must not be able to reduce an event&#39;s capacity below its current number of registered participants. Only users with active accounts and approved profiles can register for events. Event creation also requires an approved profile and the organizer role.
5. Enforce organizer ownership and moderator permissions. Organizers can manage only their own events, while moderators can perform the event-management actions allowed by their role.
6. Build Vue event list, detail, creation, editing, registration, withdrawal and cancellation flows with accessible feedback.
7. Add API and front-end tests for filtering, registration and permission boundaries. Include tests for duplicate registrations, full events, cancelled or past events, and unauthorized event modifications.
8. Demonstrate an event lifecycle from draft or creation through publication, registration, withdrawal, cancellation or completion.

## Success criteria

The task is complete when:

- an organizer can create, view, edit and cancel their own event;
- events follow the documented lifecycle states, and only published events are discoverable by members;
- members can browse events and filter by interest and approximate location (such as a city), either separately or together;
- event details clearly show the information needed before registration, including date, approximate location, organizer, capacity and available places;
- registration and withdrawal follow the documented capacity and lifecycle rules;
- duplicate registrations are prevented;
- simultaneous registrations cannot exceed an event&#39;s capacity;
- withdrawals free a place, and members can register again when places are available;
- cancelled and past events have understandable states and cannot accept new registrations;
- published events with registrations are cancelled rather than permanently deleted;
- members cannot alter another organizer&#39;s event;
- moderator permissions are enforced on event management actions;
- the Vue event journey handles empty, loading, success and failure states;
- API and front-end tests cover registration, filtering and unauthorized access.

## Context

After registering for a local event, members need a private way to continue a conversation. The MVP uses asynchronous messages, not a live chat, so the team can focus on privacy, conversation ownership, readable history and reliable delivery.

## Your mission

Implement a simple one-to-one messaging experience connected to authenticated users. A member must never access another conversation by guessing an identifier, and the interface must make the sender, recipient and message status understandable.

This is deliberately an asynchronous inbox, not a real-time chat product. Focus on the privacy boundary, reliable persistence and a readable conversation history.

A member can start a conversation with another member if both have an active registration for the same event, or with the organizer of an event they are actively registered for. Withdrawn registrations do not grant permission to start new conversations. Both participants must have approved profiles, active accounts and allow private messaging through their privacy settings. Once created, a conversation can continue even after the event has ended or a participant has withdrawn, provided both accounts remain authorized to communicate.

If either participant disables private messaging or loses the required account or profile status, sending new messages must be refused. Access to existing message history must continue to follow the documented account and privacy restrictions.

## Steps

1. Create migrations for conversations and messages with appropriate ownership relations. Each conversation must contain exactly two distinct participants, and duplicate conversations between the same two users must be prevented, regardless of who starts the conversation.
2. Implement conversation creation, listing, message creation and message history routes. Only authenticated users with approved profiles can initiate conversations, according to the contact rules defined above.
3. Restrict each conversation to its two participants and protect every read and write operation. The sender must always be identified from the authenticated session or token, never from a user-provided identifier. Pending, blocked or suspended accounts must not be able to initiate or send messages. Existing conversations must remain inaccessible to unrelated users.
4. Validate message length and content. Messages must contain between 1 and 1,000 characters after trimming whitespace. Store and display messages as plain text, without executing user-provided HTML or scripts. Empty messages and messages exceeding the limit must be rejected with clear feedback.
5. Build Vue conversation and message views with empty, loading and failure states. Display messages chronologically, clearly identify the sender and recipient, and provide an understandable form for sending messages. Real-time messaging, attachments and read receipts are not required.
6. Add API tests for privacy boundaries and at least one front-end test for message submission or history. Include tests for unauthorized conversation access, invalid messages, duplicate conversations and contact restrictions.
7. Demonstrate empty conversations, an invalid message, a successful exchange between authorized members and an attempt to access an unrelated conversation.

## Success criteria

The task is complete when:

- an authenticated member can start a conversation only when both members have an active registration for the same event, or when the member has an active registration for an event organized by the recipient;
- both participants must have approved profiles, active accounts and allow private messaging;
- a conversation contains exactly two distinct participants, and duplicate conversations between the same users are prevented;
- two authorized participants can send and retrieve messages asynchronously;
- existing conversations can continue after an event ends or a participant withdraws, provided the accounts remain authorized to communicate;
- message history is ordered and associated with the correct participants;
- empty conversations, invalid messages and failed requests are handled clearly;
- message length and content validation are enforced by the API;
- unsafe HTML is not rendered as executable content;
- a member cannot access or send messages to an unrelated conversation by changing an identifier;
- the message sender is determined by the authenticated user and cannot be impersonated;
- anonymous users are refused, and blocked or suspended accounts cannot send messages;
- the Vue messaging journey is usable on desktop and mobile;
- API privacy tests and a front-end messaging test pass.</div></div>

## Context

A platform for meeting new people needs an operational safety boundary. Moderators must be able to act on profiles and events, but ordinary members must not gain access to administrative actions or private moderation data. The team must also review the security and privacy implications of the completed flows.

## Your mission

Build a minimal protected moderation area and harden the application before delivery. Keep moderation actions explicit and auditable, improve error handling and document the privacy, legal and accessibility decisions that affect the audience.

Moderation is part of the product, not an unrestricted administration shortcut. Define what a moderator can see, which state changes are allowed and how the interface communicates a blocked or pending profile. Moderators must not have unrestricted access to private conversations or messages. The team may keep the workflow small, but it must be safe, explainable and testable.

## Steps

1. Complete the moderation data model using versioned migrations. Reuse the profile statuses (`pending`, `approved`, `blocked`) introduced in Task 1. Add or complete an account status (`active`, `suspended`) and implement the `ModerationAction` entity defined in Task 0 to record moderation decisions. Reuse the existing role system rather than creating duplicate roles or fields.
2. Implement protected NestJS routes and Vue moderation screens. Moderators must be able to approve pending profiles, block approved profiles, unblock blocked profiles, suspend or reactivate accounts, and cancel inappropriate events. Unblocking a profile restores its `approved` status. Only authorized moderators can perform these actions.
3. Apply consistent restrictions across the application:  
        - `pending`: the member can access and edit their own profile and browse published events, but cannot create events, register for activities or use private messaging until the profile is approved.  
        - `approved`: the member can use the social features according to their role and privacy settings.  
        - `blocked`: the profile is hidden, and the member cannot create events, register for activities or exchange private messages. They can still access their own account status and sign out.  
        - `suspended` account: the user cannot access protected member features, even with an existing valid session or token. Only access necessary to understand the restriction and sign out may remain available.  

   These restrictions must be enforced by the API, not only by hiding buttons in Vue. Account and profile restrictions must be checked by the API on protected requests, including when an existing session or token is still valid.
4. Add safe error responses, server-side input validation, authorization checks and secure headers where appropriate. Prevent ordinary users from modifying their own roles, moderation statuses or account restrictions through manipulated requests. Moderators must not be able to read private messages simply because they have moderation permissions.
5. Add legal notices and a plain-language privacy explanation for profile and message data. Explain what information is visible to other members, what remains private and how personal information is handled in this educational MVP.
6. Review keyboard navigation, contrast, text size, responsive layouts and destructive actions. Moderation screens must clearly identify the targeted profile, account or event and request confirmation before blocking a profile, suspending an account or cancelling an event.
7. Execute an acceptance plan covering happy paths, invalid data, expired sessions and forbidden actions. Include tests for pending and blocked profiles, suspended accounts, unauthorized moderation requests, protected conversations and event cancellation. Record the acceptance scenarios, expected results and actual outcomes in `docs/security-review.md`.
8. Record a short security review with the risk, impact, mitigation and remaining limitation for each important issue. Each moderation action must also be recorded with the moderator, target, action, date and optional reason, without storing passwords or private message content in the audit log.

## Success criteria

The task is complete when:

- moderator-only routes and screens are inaccessible to ordinary members;
- moderators can approve, block and unblock profiles, suspend or reactivate accounts, and manage inappropriate events according to their permissions;
- pending profiles remain hidden from member discovery until approved;
- blocked profiles cannot use the documented social features;
- suspended accounts cannot bypass restrictions by reusing an existing session or token;
- moderation state changes are recorded with the responsible moderator, affected resource, action and date;
- ordinary members cannot modify their own roles, moderation statuses or account restrictions;
- moderators cannot access private conversations or messages without an explicitly authorized feature;
- invalid input, missing resources, expired sessions and forbidden actions return safe feedback;
- no stack trace, secret, database detail or private message is exposed to users;
- legal and privacy information is accessible from the application;
- the main screens work with keyboard navigation, readable contrast and responsive layouts;
- destructive moderation actions require clear confirmation;
- the acceptance plan records successful and rejected scenarios;
- the security review identifies mitigations and remaining limitations.</div></div>

## Context

The project must be transferable to another developer. A local application that only works because of undocumented machine settings cannot be evaluated reliably. The mandatory external API should add a small, defensible benefit, such as geocoding an event city or retrieving a public location label, without expanding the MVP unnecessarily.

## Your mission

Package the application for reproducible evaluation. Connect one useful external API through a limited integration, protect configuration, make PostgreSQL initialization repeatable and ensure the README describes the actual project.

The integration should remain proportional to the MVP. For example, a public geocoding or location-label service may enrich an event without storing an exact address. A single meaningful endpoint is enough when the team handles timeout, failure and data minimization correctly.

## Steps

1. Create Dockerfiles and a `docker-compose.yml` for NestJS, Vue and PostgreSQL. The three services must communicate correctly, and the application must be accessible through documented local ports.
2. Add health checks and document service dependencies and ports. PostgreSQL must be ready before database migrations or dependent API operations are executed. Use Docker Compose health checks and appropriate dependency conditions rather than relying only on container startup order.
3. Add `.env.example`; ensure secrets, passwords and private credentials are never committed. Document all required environment variables and add sensitive configuration files to `.gitignore`. Demonstration accounts may use clearly identified, non-sensitive test credentials.
4. Run versioned migrations and load reproducible seed data from a blank PostgreSQL database. The seed must include demonstration accounts for member, organizer and moderator roles, approved member profiles, and enough events, registrations and conversations to demonstrate the main user journeys. Document how to reset the database and reload the seed without using real personal information.
5. Integrate one useful third-party API into the application, such as a city lookup or geocoding service. The integration must provide a clear user benefit and be accessible through the application interface. Handle timeouts, invalid responses and service unavailability. If the external API fails, users must still be able to complete the essential action, for example by entering a city manually. Document the API provider, endpoint, any required key, usage limits and fallback behavior. Keep private API keys on the NestJS side.
6. Complete API and front-end tests and record the commands and results. Include relevant integration tests covering authentication, permissions, events, registrations, messaging and moderation. Document any failed or unimplemented tests honestly.
7. Document installation, launch, migration, reset, test and demonstration-account procedures. The README must explain the project structure, environment variables, Docker Compose commands, API and Vue access URLs, test commands and known limitations.
8. Add basic page metadata, optimize images and transferred assets, and record eco-design choices. Provide meaningful page titles, accessible image alternatives and reasonable asset sizes. SEO metadata should focus on any publicly accessible pages. Advanced SEO and server-side rendering are not required.
9. Run the complete setup from a clean environment and record any limitation that another evaluator must know. Verify that another developer can clone the repository, configure the environment, start the services, apply migrations, load demonstration data and use the main application features by following the README.

## Success criteria

The task is complete when:

- Docker Compose starts NestJS, Vue and PostgreSQL with documented dependencies and accessible ports;
- database readiness is handled correctly before migrations and dependent API operations;
- a clean PostgreSQL database can be created through the versioned migrations;
- reproducible seed data can be loaded and reset without real personal information;
- demonstration accounts for member, organizer and moderator roles are available, with enough data to test the main user journeys;
- the external API integration provides a documented user or product benefit and is accessible through the Vue interface;
- external API timeout and failure behavior is handled safely, without blocking essential application functionality;
- `.env.example` documents required configuration without containing secrets;
- no real password, private token or sensitive credential is committed;
- API and front-end tests can be run from the documented commands, and their results are recorded;
- the README accurately explains installation, migration, reset, tests and demonstration access;
- another developer can reproduce the application setup from a clean environment using the documented instructions;
- SEO and eco-design decisions are documented and proportionate to the MVP.</div></div>

## Context

The final review evaluates both the product and the team&#39;s understanding of its engineering choices. A successful presentation must connect the user&#39;s needs to the Vue interface, NestJS modules, PostgreSQL data and security boundaries.

## Your mission

Prepare a concise, evidence-based demonstration of Re-Tired Hearts. Show a realistic journey, an expected rejection or error, and the decisions that make the application safe and maintainable. Every member must be able to explain the whole product and defend a meaningful contribution.

The presentation should demonstrate the product rather than list every implemented file. Use one scenario that links the main user needs together, then use a second short scenario to reveal a permission or validation boundary. Reserve time for questions and make unsupported claims visible as limitations.

The demonstration must use the actual application, with its Vue interface, NestJS API and PostgreSQL database running. Screenshots or slides may support explanations but must not replace a working demonstration of the main features.

## Steps

1. Demonstrate a complete member journey:
     - Register or log in with a member account.
     - If a new member account is registered, demonstrate its approval through the moderator workflow before continuing, or use an existing approved demonstration account.
     - View and edit the member&#39;s own profile.
     - Discover another approved member profile.
     - Browse local events and use at least one filter.
     - Register for an available event and verify the registration status.
     - Start a private conversation with an eligible member and exchange messages.

2. Demonstrate at least one validation error, one forbidden action and one moderation action. For example, attempt to register for a full event, access another member&#39;s private conversation, or block a profile using a moderator account. Show the feedback returned by the application and explain the API rule responsible for the rejection.

3. Present the architecture, data model, migrations and main API routes. Explain how Vue communicates with NestJS, how PostgreSQL stores the data, and how the main entities are related. Use the database diagram created in Task 0 to explain primary keys, foreign keys, relationships and important constraints.

4. Explain authentication, privacy, accessibility, testing, Docker and external API choices. Demonstrate or explain how roles and permissions are enforced by the API, how personal information is protected, and what happens when the external API is unavailable.

5. Present test results, Docker Compose startup and deployment instructions, limitations and possible future work. Show the actual test commands and results, explain how the application can be started from a clean environment, and identify any known issue or incomplete feature.

6. Ensure that each member participates in the demonstration and technical explanations. Every member must be able to explain the global architecture, describe their own contribution and answer questions about a part they did not implement alone.

7. Prepare a final delivery checklist and identify one realistic improvement that was intentionally left outside the MVP. Verify that the repository contains the application code, database migrations, reproducible seed data, tests, architecture documentation, security review and an up-to-date README.

## Success criteria

The task is complete when:

- the presentation follows a clear plan and fits the time allowed by the mentor;
- the team demonstrates a working application through the Vue interface, connected to NestJS and PostgreSQL;
- the team demonstrates registration or login, profile discovery, an event, a registration and a private message between authorized members;
- the team demonstrates at least one validation error, one forbidden action and one moderation action;
- the architecture, data flow, PostgreSQL model, relationships and migrations are explained accurately;
- authentication, privacy, moderation, accessibility, tests, Docker and external API integration choices are justified;
- the demonstrated application matches the repository and README;
- Docker Compose startup, database initialization and demonstration accounts are documented and reproducible;
- test commands, actual results and known limitations are presented honestly;
- every member participates, explains their contribution and can answer questions about the global project;
- the final repository contains the required code, migrations, seed data, tests and documentation;
- the team can identify one improvement deliberately left outside the MVP.</div></div>
