import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { faqData } from "@/data/faq";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

// ─── Contenu des pages d'aide ─────────────────────────────────────────────────

const HELP_CONTENT: Record<
  string,
  {
    title: string;
    icon: string;
    faqCategory: string;
    sections: { title: string; body: string }[];
  }
> = {
  remuneration: {
    title: "Comment fonctionnent les revenus créateurs",
    icon: "💰",
    faqCategory: "Revenus",
    sections: [
      {
        title: "Le principe : 1€ pour 90 consommations",
        body: "Chaque mois, Akeli distribue 1€ par tranche de 90 consommations générées par votre catalogue. Une consommation est comptée lorsqu'un abonné Akeli Premium intègre l'une de vos recettes dans son plan alimentaire et la marque comme consommée. Une même recette peut être consommée plusieurs fois par le même utilisateur — chaque occurrence compte.",
      },
      {
        title: "Les tranches s'accumulent dans le temps",
        body: "Si vous atteignez 80 consommations en janvier, elles ne sont pas perdues. Elles s'ajoutent aux consommations de février — dès que la tranche de 90 est complète, le 1€ est crédité. Rien n'est jamais perdu entre deux mois.",
      },
      {
        title: "Revenus Mode Fan : le 1€ garanti",
        body: "En Mode Fan (accessible dès 30 recettes publiées), chaque utilisateur qui vous choisit comme créateur Fan vous alloue 1€/mois fixe, indépendamment du nombre de recettes qu'il a consommées. C'est un revenu stable, prévisible, qui s'ajoute à vos revenus à la consommation.",
      },
      {
        title: "Paiements : le 5 de chaque mois",
        body: "Les paiements sont effectués le 5 du mois pour les revenus du mois précédent. Le seuil minimum de paiement est de 10€ — en dessous, les revenus sont reportés au mois suivant et cumulés. Akeli ne prélève aucune commission sur vos revenus.",
      },
      {
        title: "Voir le détail dans votre dashboard",
        body: "La section \"Revenus\" de votre dashboard distingue revenus à la consommation et revenus Fan, avec un filtre par mois et un détail par recette. Vous pouvez suivre l'évolution de vos consommations en temps réel.",
      },
    ],
  },
  "mode-fan": {
    title: "Le Mode Fan — guide complet",
    icon: "⭐",
    faqCategory: "Mode Fan",
    sections: [
      {
        title: "Qu'est-ce que le Mode Fan ?",
        body: "Le Mode Fan est un système d'abonnement direct entre un utilisateur Akeli et un créateur. L'utilisateur choisit de dédier l'intégralité de son abonnement Akeli (3€/mois) à un seul créateur. De ce montant, 1€ vous est reversé chaque mois, garanti, quel que soit son niveau de consommation.",
      },
      {
        title: "Condition d'éligibilité : 30 recettes publiées",
        body: "Pour être éligible au Mode Fan, vous devez avoir publié au moins 30 recettes dans votre catalogue. Ce seuil garantit que votre catalogue est suffisamment varié pour qu'un utilisateur puisse construire 90% de ses repas du mois à partir de vos recettes sans trop de répétitions.",
      },
      {
        title: "Les règles côté utilisateur",
        body: "Un utilisateur en Mode Fan s'engage à construire 90% de ses repas du mois à partir de votre catalogue. Les 10% restants sont libres. Ce ratio est contrôlé techniquement — l'app bloque automatiquement l'ajout de recettes externes au-delà de 9 recettes différentes d'autres créateurs par mois.",
      },
      {
        title: "Changement de créateur Fan",
        body: "Un utilisateur peut changer de créateur Fan à tout moment, mais le changement prend effet au premier jour du mois suivant. Vous conservez son 1€ pour le mois en cours même si le changement a été initié en milieu de mois.",
      },
      {
        title: "Suivre vos fans actifs",
        body: "Dans votre dashboard, la section \"Mode Fan\" affiche en temps réel le nombre d'abonnés Fan actifs et les revenus Fan du mois en cours. Cette donnée est clairement séparée des revenus à la consommation standard.",
      },
    ],
  },
  traduction: {
    title: "Traduction automatique des recettes",
    icon: "🌍",
    faqCategory: "Traduction",
    sections: [
      {
        title: "Comment ça fonctionne",
        body: "Lorsque vous publiez une recette en français ou en anglais, Akeli la traduit automatiquement dans 8 langues via IA. Les traductions apparaissent dans le formulaire d'édition sous votre langue originale. Elles ne sont visibles par les utilisateurs qu'après votre validation.",
      },
      {
        title: "Les 8 langues disponibles en V1",
        body: "Français et anglais sont les langues sources (gérées nativement). Les 6 langues générées automatiquement sont : arabe, wolof, swahili, portugais, espagnol et haoussa. La qualité peut varier selon la langue — c'est pourquoi la correction manuelle est toujours possible.",
      },
      {
        title: "Modifier une traduction",
        body: "Depuis la page d'édition de chaque recette, vous avez accès à toutes les versions linguistiques — titre, description, ingrédients, étapes. Chaque champ est modifiable individuellement. Vos corrections sont enregistrées définitivement et ne seront pas écrasées par une nouvelle génération automatique.",
      },
      {
        title: "Quelle langue source choisir ?",
        body: "Rédigez toujours dans la langue que vous maîtrisez le mieux. Akeli traduit depuis votre langue source, qu'elle soit le français ou l'anglais. Une recette rédigée dans votre langue naturelle donne des traductions de meilleure qualité que si vous essayez de rédiger dans une langue secondaire.",
      },
    ],
  },
  "stripe-setup": {
    title: "Configurer votre compte Stripe",
    icon: "💳",
    faqCategory: "Stripe",
    sections: [
      {
        title: "Pourquoi Stripe est obligatoire",
        body: "Stripe est le prestataire de paiement utilisé par Akeli pour verser vos revenus directement sur votre compte bancaire. Sans compte Stripe configuré, vos revenus s'accumulent mais ne peuvent pas être versés. La configuration prend environ 5 minutes.",
      },
      {
        title: "Étapes de configuration",
        body: "1. Allez dans \"Paramètres → Paiements\" depuis votre dashboard. 2. Cliquez sur \"Configurer mon compte de paiement\". 3. Vous êtes redirigé vers Stripe pour compléter votre profil : identité (pièce d'identité), IBAN de votre compte bancaire. 4. Une fois validé par Stripe, votre compte est actif et les versements sont automatiques.",
      },
      {
        title: "Délai de validation",
        body: "En général, moins de 24 heures pour les vérifications d'identité standard. Stripe peut demander des documents supplémentaires dans certains cas — vous serez alors notifié par email directement par Stripe (vérifiez vos spams).",
      },
      {
        title: "Pays supportés",
        body: "Stripe Connect est disponible dans la plupart des pays européens et dans de nombreux pays hors Europe. Si votre pays n'est pas encore supporté, contactez le support créateurs à creators@akeli.app — nous cherchons des solutions alternatives pour les marchés non couverts.",
      },
      {
        title: "Modifier votre IBAN",
        body: "Depuis \"Paramètres → Paiements → Gérer mon compte Stripe\", vous pouvez modifier vos informations bancaires à tout moment. Les modifications sont effectives dès le prochain cycle de paiement (le 5 du mois suivant).",
      },
    ],
  },
  "suppression-compte": {
    title: "Supprimer votre compte créateur",
    icon: "🗑️",
    faqCategory: "Support",
    sections: [
      {
        title: "Comment supprimer votre compte",
        body: "Depuis votre dashboard, allez dans \"Paramètres → Zone de danger → Supprimer mon compte\". Vous devrez confirmer en tapant le mot \"supprimer\". Cette action est irréversible.",
      },
      {
        title: "Ce qui est supprimé",
        body: "Votre profil créateur, vos données personnelles (email, nom, photo), vos informations de paiement Stripe, et l'accès à votre espace créateur sont définitivement supprimés.",
      },
      {
        title: "Ce qui est conservé",
        body: "Vos recettes ne sont pas supprimées — elles sont anonymisées pour préserver l'expérience des utilisateurs qui les ont dans leurs plans repas. Leur affichage ne mentionne plus votre nom ni votre profil.",
      },
      {
        title: "Vos revenus dus",
        body: "Les revenus calculés jusqu'à la date de suppression de votre compte seront versés lors du prochain cycle de paiement (le 5 du mois suivant), à condition d'avoir atteint le seuil minimum de 10€. En dessous de ce seuil, les revenus restants ne peuvent pas être versés.",
      },
      {
        title: "Vous changez d'avis ?",
        body: "Il n'est pas possible de récupérer un compte supprimé. Si vous souhaitez simplement faire une pause, vous pouvez désactiver temporairement votre profil depuis \"Paramètres\" — vos recettes passent en mode privé sans suppression de compte.",
      },
    ],
  },
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = HELP_CONTENT[slug];
  if (!content) return {};
  return { title: `${content.title} — Aide Akeli` };
}

export function generateStaticParams() {
  return Object.keys(HELP_CONTENT).map((slug) => ({ slug }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HelpDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = HELP_CONTENT[slug];
  if (!content) notFound();

  const relatedFAQ = faqData.filter(
    (q) => q.placement === "dashboard" && q.category === content.faqCategory
  );

  return (
    <div className="max-w-2xl space-y-10">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Centre d'aide
        </Link>
        <span>/</span>
        <span className="text-foreground">{content.title}</span>
      </nav>

      {/* ── En-tête ── */}
      <div className="space-y-2">
        <div className="text-4xl">{content.icon}</div>
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
      </div>

      {/* ── Sections de contenu ── */}
      <div className="space-y-6">
        {content.sections.map((section, i) => (
          <section
            key={i}
            className="rounded-xl border border-border bg-card p-6 space-y-2"
          >
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>

      {/* ── FAQ liées ── */}
      {relatedFAQ.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Questions liées — {content.faqCategory}
          </h2>
          <FAQAccordion items={relatedFAQ} />
        </section>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Link
          href="/help"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          ← Retour au centre d'aide
        </Link>
        <a
          href="mailto:creators@akeli.app"
          className="text-sm text-primary font-medium hover:underline"
        >
          Contacter le support
        </a>
      </div>
    </div>
  );
}
