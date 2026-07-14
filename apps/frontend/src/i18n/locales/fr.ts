import type { TranslationDict } from "../types";
import en from "./en";
import workspaceFr from "./workspace-fr";

/** French — workspace + chrome; other modules fall back to English via store.t */
const frOverrides: TranslationDict = {
  ...workspaceFr,
  "common.loading": "Chargement…",
  "common.error": "Une erreur s'est produite",
  "common.retry": "Réessayer",
  "common.done": "Terminé",
  "common.welcomeBack": "Bon retour",
  "common.signOut": "Se déconnecter",
  "common.myDashboard": "Mon tableau de bord",
  "common.openMenu": "Ouvrir le menu",
  "common.collapse": "Réduire la barre latérale",
  "common.expand": "Développer la barre latérale",
  "common.cancel": "Annuler",
  "common.confirm": "Confirmer",
  "lang.switch": "Langue",
  "login.signIn": "Se connecter",
  "login.title": "Bon retour",
  "login.subtitle": "Connectez-vous à votre espace DeMaxtore",
  "login.email": "E-mail",
  "login.password": "Mot de passe",
  "login.forgot": "Mot de passe oublié ?",
  "login.submit": "Se connecter",
  "login.invalid": "E-mail ou mot de passe invalide",

  "rfq.quotation.award.closeOpen.title": "Clôturer les offres et continuer ?",
  "rfq.quotation.award.closeClosed.title": "Passer à l'évaluation ?",
  "rfq.quotation.award.closeOpen.description": "Souhaitez-vous arrêter la réception de nouvelles offres et passer à la sélection du fournisseur ? Les fournisseurs ne pourront plus soumettre de nouvelles offres après cette étape.",
  "rfq.quotation.award.closeClosed.description": "Les offres ont été collectées. Souhaitez-vous passer à l'évaluation et confirmer le fournisseur sélectionné ?",
  "rfq.quotation.award.decline": "Non, annuler",
  "rfq.quotation.award.confirmContinue": "Oui, continuer",
  "rfq.quotation.award.pendingQuote": "Offre que vous êtes sur le point de sélectionner : {price}",
  "rfq.quotation.award.select.title": "Sélectionner le fournisseur",
  "rfq.quotation.award.select.description": "Confirmez le fournisseur retenu et indiquez votre justification.",
  "rfq.quotation.award.selectConfirm": "Sélectionner le fournisseur",
  "rfq.quotation.award.verifiedManufacturer": "Fabricant vérifié",
  "rfq.quotation.award.leadTime": "{days} jours de délai",
  "rfq.quotation.award.rationalePlaceholder": "Au moins 15 caractères — pourquoi sélectionnez-vous ce fournisseur ?",
  "rfq.quotation.award.selectFootnote": "Après confirmation, les offres seront clôturées (si nécessaire), l'évaluation terminée et le fournisseur sélectionné informé.",
  "rfq.quotation.award.success": "Fournisseur sélectionné avec succès",
  "rfq.quotation.award.error": "Impossible de finaliser la sélection du fournisseur",
  "rfq.quotation.award.checkboxSelect": "Sélectionner {supplier} comme fournisseur",
  "rfq.quotation.compare.checkbox": "Comparer {supplier}",
};

const fr: TranslationDict = { ...en, ...frOverrides };

export default fr;
