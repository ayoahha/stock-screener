#!/usr/bin/env bash

###############################################################################
# Stock Screener - Script de Vérification Qualité Code
###############################################################################
#
# Ce script lance des outils d'analyse de qualité et de sécurité :
#   - TypeScript strict type checking
#   - ESLint
#   - Prettier
#   - Semgrep (analyse de sécurité)
#   - Tests unitaires
#
# Usage :
#   bash scripts/check-quality.sh
#   ou
#   pnpm quality:check
#
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_step() { echo -e "\n${BLUE}▶${NC} $1\n"; }

ERRORS=0

###############################################################################
# 1. TypeScript Type Checking
###############################################################################

print_step "TypeScript Type Checking..."

if pnpm type-check; then
  print_success "Aucune erreur TypeScript"
else
  print_error "Erreurs TypeScript détectées"
  ERRORS=$((ERRORS + 1))
fi

###############################################################################
# 2. ESLint
###############################################################################

print_step "ESLint..."

if pnpm lint; then
  print_success "Aucune erreur ESLint"
else
  print_error "Erreurs ESLint détectées"
  ERRORS=$((ERRORS + 1))
fi

###############################################################################
# 3. Prettier
###############################################################################

print_step "Prettier (format check)..."

if pnpm prettier --check "**/*.{ts,tsx,md,json}"; then
  print_success "Code correctement formaté"
else
  print_warning "Code mal formaté. Lancez 'pnpm format' pour auto-fix"
  ERRORS=$((ERRORS + 1))
fi

###############################################################################
# 4. Tests Unitaires
###############################################################################

print_step "Tests Unitaires..."

if pnpm test:unit; then
  print_success "Tous les tests unitaires passent"
else
  print_error "Échec de tests unitaires"
  ERRORS=$((ERRORS + 1))
fi

###############################################################################
# 5. Semgrep (Sécurité)
###############################################################################

print_step "Semgrep (Analyse de sécurité)..."

if command -v semgrep &> /dev/null; then
  echo "Lancement de Semgrep avec règles auto (OWASP Top 10, security best practices)..."

  if semgrep --config=auto --error --quiet .; then
    print_success "Aucune vulnérabilité détectée par Semgrep"
  else
    print_error "Vulnérabilités détectées par Semgrep"
    ERRORS=$((ERRORS + 1))
  fi
else
  print_warning "Semgrep non installé. Installation recommandée :"
  echo "  pip install semgrep"
  echo "  ou"
  echo "  brew install semgrep"
  echo ""
  print_warning "Analyse de sécurité ignorée"
fi

###############################################################################
# Récapitulatif
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
  print_success "QUALITÉ CODE : EXCELLENT ✨"
  echo ""
  echo "Aucune erreur détectée. Code prêt pour commit/push."
  echo ""
  exit 0
else
  print_error "QUALITÉ CODE : $ERRORS PROBLÈME(S) DÉTECTÉ(S)"
  echo ""
  echo "Corrigez les erreurs ci-dessus avant de commit/push."
  echo ""
  exit 1
fi
