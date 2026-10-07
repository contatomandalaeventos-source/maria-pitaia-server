#!/bin/bash

# 🚀 Script de Setup - GitHub e Railway
# Maria Pitaia Criações - Deployment Automatizado

echo "🌿 Maria Pitaia Criações - Setup de Deployment"
echo "=============================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório certo
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

echo -e "${BLUE}PASSO 1: Verificar Git${NC}"
git status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Erro: Git não configurado"
    exit 1
fi
echo -e "${GREEN}✅ Git OK${NC}"
echo ""

echo -e "${BLUE}PASSO 2: Verificar GitHub CLI${NC}"
gh auth status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  GitHub CLI não autenticado"
    echo "Execute: gh auth login"
    echo ""
fi
echo ""

echo -e "${BLUE}PASSO 3: Criar Repositório GitHub${NC}"
echo "Opção A: Repositório criado via web UI (https://github.com/new)"
echo "Opção B: Deixei um script de setup automático abaixo"
echo ""
read -p "Já criou o repositório no GitHub? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Digite o nome do seu usuário GitHub:${NC}"
    read GITHUB_USER

    echo ""
    echo -e "${BLUE}PASSO 4: Configurar Remote${NC}"

    # Check if origin already exists
    if git remote | grep -q "^origin$"; then
        echo "Removendo remote origin existente..."
        git remote remove origin
    fi

    git remote add origin https://github.com/$GITHUB_USER/maria-pitaia-server.git
    echo -e "${GREEN}✅ Remote adicionado${NC}"

    echo ""
    echo -e "${BLUE}PASSO 5: Preparar Branch${NC}"
    git branch -M main
    echo -e "${GREEN}✅ Branch renomeado para 'main'${NC}"

    echo ""
    echo -e "${BLUE}PASSO 6: Fazer Push${NC}"
    git push -u origin main

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Código no GitHub!${NC}"
        echo ""
        echo "Repositório: https://github.com/$GITHUB_USER/maria-pitaia-server"
        echo ""
    else
        echo "❌ Erro no push"
        echo "Verifique:"
        echo "1. Se o repositório existe no GitHub"
        echo "2. Se você tem permissão de escrita"
        echo "3. Se as credenciais estão corretas"
        exit 1
    fi
else
    echo "OK, crie o repositório e execute novamente"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Setup GitHub Completo!${NC}"
echo "=============================================="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Vá para Railway: https://railway.app/new"
echo "2️⃣  Selecione 'Deploy from GitHub'"
echo "3️⃣  Selecione 'maria-pitaia-server'"
echo "4️⃣  Railway vai fazer deploy automaticamente"
echo ""
echo "Para mais detalhes, veja: DEPLOYMENT_COMPLETO.md"
echo ""
