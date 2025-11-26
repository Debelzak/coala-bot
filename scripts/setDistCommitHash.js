import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

try {
  // Caminho para o diretório .git do projeto
  const gitDir = resolve(".git");

  // Lê o conteúdo do arquivo HEAD
  const headFile = readFileSync(join(gitDir, "HEAD"), "utf8").trim();

  let commitHash = "";

  if (headFile.startsWith("ref:")) {
    // HEAD aponta para um branch, ex: "ref: refs/heads/main"
    const refPath = headFile.split(" ")[1];
    commitHash = readFileSync(join(gitDir, refPath), "utf8").trim();
  } else {
    // HEAD está detached -> contém diretamente o hash
    commitHash = headFile;
  }

  // Garante que a pasta dist existe
  mkdirSync("dist", { recursive: true });

  // Escreve o hash em dist/VERSION
  const versionFile = join("dist", "VERSION");
  writeFileSync(versionFile, commitHash + "\n");

} catch (err) {
  console.error("Erro ao obter versão:", err.message);
  process.exit(1);
}