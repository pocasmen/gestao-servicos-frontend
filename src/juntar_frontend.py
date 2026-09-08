import os

# Nome do ficheiro de saída
output_file = 'frontend_completo.txt'

# Extensões que queremos ler
extensions = ('.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json')

# Pastas a ignorar
ignore_dirs = {
    'node_modules', '.git', 'dist', 'playwright-report', 
    'test-results', '__pycache__', '.vite', 'coverage'
}

# Ficheiros a ignorar (incluindo o próprio script e o lock file que é gigante)
ignore_files = {'juntar_frontend.py', 'package-lock.json', output_file}

# Vamos começar a busca a partir da raiz do frontend (um nível acima de src, se o script estiver em src)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Se estivermos dentro de 'src', subimos um nível para apanhar configs da raiz
base_path = os.path.dirname(current_dir) if os.path.basename(current_dir) == 'src' else current_dir

print(f"A iniciar recolha de ficheiros em: {base_path}")

try:
    with open(os.path.join(base_path, output_file), 'w', encoding='utf-8') as outfile:
        # Percorre todos os ficheiros
        for root, dirs, files in os.walk(base_path):
            # Modifica dirs in-place para o os.walk ignorar estas pastas
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                if file.endswith(extensions) and file not in ignore_files:
                    path = os.path.join(root, file)
                    relative_path = os.path.relpath(path, base_path)
                    
                    try:
                        with open(path, 'r', encoding='utf-8') as infile:
                            # Cabeçalho identificador do ficheiro
                            outfile.write(f"\n{'='*80}\n")
                            outfile.write(f"FICHEIRO: {relative_path}\n")
                            outfile.write(f"{'='*80}\n\n")
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        print(f"Erro ao ler {relative_path}: {e}")

    print(f"\nSucesso! Ficheiro '{output_file}' gerado na raiz do frontend.")
    print(f"Caminho: {os.path.join(base_path, output_file)}")

except Exception as e:
    print(f"Erro fatal: {e}")