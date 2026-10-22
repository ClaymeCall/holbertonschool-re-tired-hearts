<template>
  <section class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <h1 class="text-4xl font-extrabold leading-tight tracking-tight text-ink">Mentions légales et confidentialité</h1>
    <p class="mt-2 text-xl text-muted">Ce que nous faisons de vos informations, expliqué simplement.</p>

    <nav aria-label="Sur cette page" class="mt-6 rounded-lg bg-mist p-5">
      <ul class="space-y-1 text-lg font-semibold">
        <li><a href="#editeur" class="text-brand underline">Qui édite ce service</a></li>
        <li><a href="#visible" class="text-brand underline">Ce que les autres voient</a></li>
        <li><a href="#conserve" class="text-brand underline">Ce que nous conservons</a></li>
        <li><a href="#cookies" class="text-brand underline">Cookies</a></li>
        <li><a href="#externe" class="text-brand underline">Service externe : suggestions de villes</a></li>
        <li><a href="#moderation" class="text-brand underline">Modération</a></li>
        <li><a href="#choix" class="text-brand underline">Vos choix</a></li>
      </ul>
    </nav>

    <h2 id="editeur" class="mt-10 text-2xl font-extrabold text-ink">Qui édite ce service</h2>
    <p class="mt-2 text-lg text-ink">
      Re-Tired Hearts est un service fictif imaginé par Happy Retired, une entreprise qui accompagne les personnes actives de plus de 60 ans.
      Il a été réalisé dans le cadre d’un projet pédagogique : il fonctionne ici sur un environnement de démonstration, avec des comptes
      d’exemple, et n’a pas d’adresse de contact publique.
    </p>

    <h2 id="visible" class="mt-10 text-2xl font-extrabold text-ink">Ce que les autres voient</h2>
    <p class="mt-2 text-lg text-ink">Seuls les membres connectés peuvent voir des profils, et seulement ceux qu’un modérateur a approuvés.</p>
    <ul class="mt-3 list-disc space-y-1 pl-6 text-lg text-ink">
      <li><strong>Visible des autres membres :</strong> votre nom affiché, votre présentation, votre ville ou région et vos centres d’intérêt.</li>
      <li><strong>Visible aussi :</strong> si vous acceptez les messages, afin que les autres sachent s’ils peuvent vous écrire.</li>
      <li><strong>Jamais visible des autres :</strong> votre adresse e-mail, votre mot de passe, l’état de votre profil et l’état de votre compte.</li>
      <li><strong>Jamais demandée :</strong> votre adresse exacte. N’indiquez qu’une ville ou une région.</li>
    </ul>
    <p class="mt-3 text-lg text-ink">
      Vos messages ne sont lisibles que par vous et la personne à qui vous écrivez. Dans l’application, les modérateurs ne peuvent pas lire les conversations.
      Dans l’interface, la liste des personnes présentes à une sortie n’est montrée qu’à l’organisateur et aux inscrits.
    </p>

    <h2 id="conserve" class="mt-10 text-2xl font-extrabold text-ink">Ce que nous conservons</h2>
    <ul class="mt-3 list-disc space-y-1 pl-6 text-lg text-ink">
      <li>Votre adresse e-mail et votre mot de passe. Le mot de passe est transformé de façon irréversible : personne ne peut le relire.</li>
      <li>Votre profil, vos inscriptions aux sorties et les sorties que vous organisez.</li>
      <li>Vos messages privés, en texte simple.</li>
      <li>L’historique des actions de modération (qui a fait quoi, sur quelle cible, quand), sans mot de passe ni contenu de message.</li>
    </ul>

    <h2 id="cookies" class="mt-10 text-2xl font-extrabold text-ink">Cookies</h2>
    <p class="mt-2 text-lg text-ink">
      Nous utilisons un seul cookie, indispensable : il garde votre connexion ouverte et ne peut pas être lu par les scripts de la page.
      Il n’y a ni publicité, ni suivi de votre navigation. Deux réglages restent uniquement dans votre navigateur, pas sur nos serveurs :
      la taille du texte, et vos contacts enregistrés (séparés pour chaque compte).
    </p>

    <h2 id="externe" class="mt-10 text-2xl font-extrabold text-ink">Service externe : suggestions de villes</h2>
    <p class="mt-2 text-lg text-ink">
      Pour vous aider à saisir une ville sans faute, notre serveur peut interroger l’annuaire officiel des communes (geo.api.gouv.fr).
      Seul le début du nom de ville que vous tapez est transmis, jamais votre identité. Si ce service ne répond pas, vous pouvez écrire
      votre ville à la main : rien ne bloque.
    </p>

    <h2 id="moderation" class="mt-10 text-2xl font-extrabold text-ink">Modération</h2>
    <p class="mt-2 text-lg text-ink">
      Un nouveau profil n’est visible des autres qu’après avoir été approuvé par un modérateur. Un modérateur peut bloquer un profil,
      suspendre un compte ou annuler une sortie inappropriée. Chaque action est enregistrée.
    </p>

    <h2 id="choix" class="mt-10 text-2xl font-extrabold text-ink">Vos choix</h2>
    <ul class="mt-3 list-disc space-y-1 pl-6 text-lg text-ink">
      <li>Vous pouvez modifier votre profil à tout moment depuis <router-link :to="{ name: 'profile' }" class="font-bold text-brand underline">Mon profil</router-link>.</li>
      <li>Vous pouvez refuser les messages : personne ne pourra vous écrire, et vous ne pourrez plus écrire non plus. Vos anciens messages restent visibles.</li>
      <li>Vous pouvez vous désinscrire d’une sortie quand vous le souhaitez, ce qui libère votre place.</li>
    </ul>
  </section>
</template>
