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
};

const fr: TranslationDict = { ...en, ...frOverrides };

export default fr;
