@echo off
chcp 65001 >nul
echo ========================================
echo    Git Auto Update Script
echo ========================================
echo.

REM Configuracao (altere com os seus dados)
set REPO_PATH=C:\AntiGravity\Project1\client
set GIT_USER=pocasmen
set GIT_EMAIL=pb.malheiro@gmail.com
set BRANCH_NAME=AntiGravity

REM Navega para a pasta do repositorio
cd /d "%REPO_PATH%"
if errorlevel 1 (
    echo ERRO: Nao foi possivel aceder a pasta %REPO_PATH%
    pause
    exit /b 1
)

echo Pasta atual: %CD%
echo.

REM Configura o usuario Git (apenas primeira vez)
git config user.name "%GIT_USER%"
git config user.email "%GIT_EMAIL%"

echo ========================================
echo 1. Verificando branch atual...
echo ========================================
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Branch atual: %CURRENT_BRANCH%

REM Muda para o branch AntiGravity se nao estiver nele
if not "%CURRENT_BRANCH%"=="%BRANCH_NAME%" (
    echo.
    echo Mudando para branch %BRANCH_NAME%...
    
    REM Primeiro verifica se ha alteracoes nao commitadas
    git diff --quiet
    if errorlevel 1 (
        echo AVISO: Existem alteracoes nao guardadas. A fazer stash...
        git stash push -m "Auto-stash antes de mudar de branch"
        set STASHED=1
    )
    
    REM Tenta mudar para o branch existente
    git checkout %BRANCH_NAME%
    if errorlevel 1 (
        echo.
        echo ERRO: Falha ao mudar para branch %BRANCH_NAME%
        echo Tentando criar branch a partir do remoto...
        
        REM Atualiza referencias remotas
        git fetch origin
        
        REM Verifica se o branch existe no remoto
        git branch -r | findstr "origin/%BRANCH_NAME%" >nul
        if errorlevel 1 (
            REM Branch nao existe no remoto, cria localmente
            echo Branch nao encontrado no remoto. Criando localmente...
            git checkout -b %BRANCH_NAME%
        ) else (
            REM Branch existe no remoto, faz checkout tracking
            echo Branch encontrado no remoto. Fazendo checkout...
            git checkout -b %BRANCH_NAME% origin/%BRANCH_NAME%
        )
        
        if errorlevel 1 (
            echo ERRO: Nao foi possivel criar/aceder ao branch
            pause
            exit /b 1
        )
    )
    
    REM Restaura stash se foi criado
    if defined STASHED (
        echo Restaurando alteracoes anteriores...
        git stash pop
    )
    
    echo [OK] Agora no branch %BRANCH_NAME%
)
echo.

echo ========================================
echo 2. Verificando estado atual...
echo ========================================
git status
echo.

echo ========================================
echo 3. Adicionando todas as alteracoes...
echo ========================================
git add .
if errorlevel 1 (
    echo ERRO: Falha ao adicionar ficheiros
    pause
    exit /b 1
)
echo Ficheiros adicionados com sucesso!
echo.

REM Verifica se ha algo para commit
git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo ========================================
    echo   Nenhuma alteracao para commit
    echo ========================================
    echo.
    echo Verificando se branch local esta sincronizado com remoto...
    
    REM Tenta fazer push mesmo sem alteracoes (caso o branch seja novo)
    git push -u origin %BRANCH_NAME%
    if errorlevel 1 (
        echo Tudo esta atualizado! Nada a fazer.
    ) else (
        echo [OK] Branch sincronizado com remoto!
    )
    echo.
    pause
    exit /b 0
)

echo ========================================
echo 4. Fazendo commit...
echo ========================================
set /p COMMIT_MSG="Digite a mensagem do commit ou Enter para default: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update: automated commit

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo ERRO: Falha ao fazer commit
    pause
    exit /b 1
)
echo Commit realizado com sucesso!
echo.

echo ========================================
echo 5. Enviando para branch %BRANCH_NAME%...
echo ========================================
git push -u origin %BRANCH_NAME%
if errorlevel 1 (
    echo.
    echo ERRO: Falha ao fazer push para branch %BRANCH_NAME%
    echo.
    echo Possíveis causas:
    echo - Branch divergiu do remoto
    echo - Sem permissoes
    echo - Problemas de rede
    echo.
    set /p FORCE="Deseja forcar push? ^(CUIDADO: sobrescreve historico remoto!^) ^(sim/nao^): "
    if /i "!FORCE!"=="sim" (
        git push -u origin %BRANCH_NAME% --force
        if errorlevel 1 (
            echo ERRO: Push forcado tambem falhou
            pause
            exit /b 1
        )
        echo [OK] Push forcado realizado!
    ) else (
        echo Push cancelado. Resolva os conflitos manualmente.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo    SUCESSO! Codigo enviado para GitHub
echo ========================================
echo Branch: %BRANCH_NAME%
echo.
echo.

pause