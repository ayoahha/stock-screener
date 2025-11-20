#!/usr/bin/env bash

###############################################################################
# Stock Screener - Script de Setup Automatisé 1-Clic
###############################################################################
#
# Ce script configure automatiquement tout l'environnement de développement :
#   1. Vérification des prérequis (Node.js, pnpm)
#   2. Installation des dépendances
#   3. Configuration .env
#   4. Génération des types Supabase
#   5. Migration de la base de données (optionnel)
#   6. Build initial
#
# Usage :
#   bash scripts/setup.sh
#   ou
#   pnpm setup
#
###############################################################################

set -e  # Arrêt immédiat en cas d'erreur

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions helper
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_step() { echo -e "\n${BLUE}▶${NC} $1\n"; }

###############################################################################
# 1. Vérification des prérequis
###############################################################################

print_step "Vérification des prérequis..."

# Node.js
if ! command -v node &> /dev/null; then
  print_error "Node.js n'est pas installé"
  print_info "Installez Node.js 20+ depuis https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  print_error "Node.js version $NODE_VERSION détectée. Version 20+ requise."
  exit 1
fi
print_success "Node.js $(node -v) détecté"

# pnpm
if ! command -v pnpm &> /dev/null; then
  print_warning "pnpm n'est pas installé. Installation automatique..."
  npm install -g pnpm@8.15.0
  print_success "pnpm installé"
else
  print_success "pnpm $(pnpm -v) détecté"
fi

###############################################################################
# 2. Installation des dépendances
###############################################################################

print_step "Installation des dépendances (cela peut prendre 1-2 minutes)..."

pnpm install --frozen-lockfile=false

print_success "Dépendances installées"

###############################################################################
# 3. Configuration .env
###############################################################################

print_step "Configuration des variables d'environnement..."

if [ ! -f .env ]; then
  print_warning "Fichier .env non trouvé. Création depuis .env.example..."
  cp .env.example .env
  print_success "Fichier .env créé"

  echo ""
  print_warning "⚠️  ACTION REQUISE : Configurez votre fichier .env"
  echo ""
  echo "Éditez le fichier .env et remplissez :"
  echo "  1. NEXT_PUBLIC_SUPABASE_URL (déjà rempli : https://ofudbmnwpaelgvoufbln.supabase.co)"
  echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY (trouvez-la dans Supabase Dashboard > Settings > API)"
  echo ""
  echo "Optionnel en v1 :"
  echo "  3. SUPABASE_SERVICE_ROLE_KEY (pour operations admin, ajoutez plus tard si besoin)"
  echo "  4. FMP_API_KEY, POLYGON_API_KEY (fallback APIs, optionnel)"
  echo ""

  read -p "Appuyez sur ENTER après avoir configuré .env, ou Ctrl+C pour quitter..."
else
  print_success "Fichier .env existant trouvé"
fi

# Vérifier que les variables essentielles sont définies
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env; then
  print_error "NEXT_PUBLIC_SUPABASE_URL non configuré dans .env"
  exit 1
fi

if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=ey" .env; then
  print_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY semble vide (doit commencer par 'ey')"
  print_info "L'app fonctionnera en mode limité sans clé Supabase valide"
fi

print_success "Configuration .env validée"

###############################################################################
# 4. Génération des types Supabase
###############################################################################

print_step "Génération des types TypeScript depuis Supabase..."

# Vérifier si la connexion Supabase fonctionne
if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=ey" .env; then
  print_info "Tentative de génération des types Supabase..."

  if pnpm db:generate-types; then
    print_success "Types Supabase générés avec succès"
  else
    print_warning "Échec de la génération des types Supabase"
    print_info "Ce n'est pas bloquant. Vous pourrez relancer plus tard avec : pnpm db:generate-types"
  fi
else
  print_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY non configuré, génération des types ignorée"
  print_info "Configurez .env puis lancez : pnpm db:generate-types"
fi

###############################################################################
# 5. Migration base de données (optionnel)
###############################################################################

print_step "Migration de la base de données..."

echo ""
print_info "Le schéma SQL est disponible dans : packages/database/src/migrations/001_initial_schema.sql"
echo ""
echo "Pour créer les tables dans Supabase :"
echo "  1. Ouvrez Supabase Dashboard > SQL Editor"
echo "  2. Copiez-collez le contenu de 001_initial_schema.sql"
echo "  3. Exécutez la requête"
echo ""
echo "Ou utilisez Supabase CLI (si connecté) :"
echo "  supabase db push"
echo ""

read -p "Avez-vous déjà exécuté la migration ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_success "Migration confirmée"
else
  print_warning "N'oubliez pas d'exécuter la migration avant de lancer l'app !"
fi

###############################################################################
# 6. Vérification TypeScript
###############################################################################

print_step "Vérification TypeScript..."

if pnpm type-check; then
  print_success "Aucune erreur TypeScript détectée"
else
  print_warning "Erreurs TypeScript détectées (pas bloquant pour dev)"
  print_info "Corrigez-les progressivement pendant le développement"
fi

###############################################################################
# 7. Build initial (optionnel)
###############################################################################

print_step "Build initial (optionnel, pour vérifier que tout compile)..."

read -p "Voulez-vous lancer un build complet ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_info "Build en cours... (peut prendre 1-2 minutes)"

  if pnpm build; then
    print_success "Build réussi !"
  else
    print_error "Échec du build"
    print_info "Pas de panique, vous pouvez développer avec 'pnpm dev' et corriger les erreurs progressivement"
  fi
else
  print_info "Build ignoré. Vous pourrez le lancer plus tard avec : pnpm build"
fi

###############################################################################
# Récapitulatif final
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
print_success "SETUP TERMINÉ !"
echo ""
echo "Prochaines étapes :"
echo ""
echo "  1. ${GREEN}Vérifiez votre .env${NC}"
echo "     → NEXT_PUBLIC_SUPABASE_URL ✓"
echo "     → NEXT_PUBLIC_SUPABASE_ANON_KEY (à ajouter)"
echo ""
echo "  2. ${GREEN}Exécutez la migration SQL${NC} (si pas encore fait)"
echo "     → Supabase Dashboard > SQL Editor"
echo "     → Copiez packages/database/src/migrations/001_initial_schema.sql"
echo ""
echo "  3. ${GREEN}Lancez l'app en mode dev${NC}"
echo "     → ${BLUE}pnpm dev${NC}"
echo ""
echo "  4. ${GREEN}Accédez à l'app${NC}"
echo "     → http://localhost:3000"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
print_info "Documentation complète : README.md"
echo ""
