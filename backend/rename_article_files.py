import os
import re
import argparse
from typing import Tuple


REGEX_PREFIX = r"^\d+\s*-\s*"


def compute_new_name(filename: str) -> Tuple[str, bool]:
    """
    Remove o prefixo numérico com hífen (ex.: "12 - ") do nome do arquivo, se existir.
    Retorna (novo_nome, alterou?).
    """
    name, ext = os.path.splitext(filename)
    new_name = re.sub(REGEX_PREFIX, "", name)
    if new_name != name:
        return new_name + ext, True
    return filename, False


def rename_pdfs(base_dir: str, dry_run: bool = True) -> None:
    """
    Percorre base_dir e subpastas, renomeando PDFs que tenham prefixo numérico com hífen.
    """
    total = 0
    changed = 0
    skipped_collision = 0

    for root, _, files in os.walk(base_dir):
        for f in files:
            if not f.lower().endswith(".pdf"):
                continue
            total += 1
            new_name, changed_flag = compute_new_name(f)
            if not changed_flag:
                continue

            old_path = os.path.join(root, f)
            new_path = os.path.join(root, new_name)

            if os.path.exists(new_path):
                print(f"⚠️  Colisão detectada, mantendo original: {old_path} -> {new_path}")
                skipped_collision += 1
                continue

            print(f"🔁 Renomear: {old_path} -> {new_path}")
            if not dry_run:
                os.rename(old_path, new_path)
                changed += 1

    print("\nResumo:")
    print(f"PDFs inspecionados: {total}")
    print(f"Renomeados: {changed}{' (dry-run)' if dry_run else ''}")
    if skipped_collision:
        print(f"Ignorados por colisão: {skipped_collision}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Renomeia PDFs removendo prefixo numérico com hífen.")
    parser.add_argument("--base-dir", default=os.path.join(os.path.dirname(__file__), "articles"), help="Diretório base dos artigos (default: backend/articles)")
    parser.add_argument("--apply", action="store_true", help="Executa de fato as renomeações (por padrão é dry-run)")
    args = parser.parse_args()

    base_dir = args.base_dir
    dry_run = not args.apply

    if not os.path.exists(base_dir):
        print(f"❌ Diretório não encontrado: {base_dir}")
        return

    print(f"📂 Varredura em: {base_dir}")
    print(f"Regex aplicado aos nomes: {REGEX_PREFIX}")
    print("Modo:", "dry-run (sem mudar nada)" if dry_run else "APLICAR (renomear arquivos)")
    rename_pdfs(base_dir, dry_run=dry_run)


if __name__ == "__main__":
    main()


