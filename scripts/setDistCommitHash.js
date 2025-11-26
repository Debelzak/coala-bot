import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

try {
  // Obtém o hash do commit atual
  const commitHash = execSync("git rev-parse HEAD")
    .toString()
    .trim();

  // Garante que a pasta dist existe
  mkdirSync("dist", { recursive: true });

  // Caminho do arquivo VERSION
  const versionFile = join("dist", "VERSION");

  // Escreve o hash
  writeFileSync(versionFile, commitHash + "\n");
} catch (err) {
  console.error("Erro ao obter versão do Git:", err.message);
  process.exit(1);
}
