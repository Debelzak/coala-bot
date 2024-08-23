<h1 align="center"> Coala Bot </h1>
<h4 align="center"> Bot para Discord, utilizado no servidor Coala. </h1>

## 🚧 Pre-requisitos

- [Node.js](https://nodejs.org/) `^20.5.1`
- Opcional: [Git](https://git-scm.com/)
- Opcional: [Docker](https://www.docker.com/)

## ⁉️ Funções

### Módulo Base
Módulo com comandos mais básicos.

#### Comandos
`/help` : Informações úteis sobre o bot.</br>
`/bora` : `!piada interna` Chama um bora</br>

### Gerenciador de Party
O bot implementa o conceito de Party inspirado nas Parties do PS4/PS5: Ao invés de salas estáticas de canais de voz, as salas são criadas dinamicamente de acordo com a necessidade do(s) usuário(s), dando ao seu dono total controle sobre aquela sala em específico, deixando de existir quando se encontra vazia, dando possibilidades de privacidade aos membros do servidor e mantendo o servidor sempre limpo.

#### Comandos
`/partysetup` : Configurações do gerenciador de salas. Permite adicionar, remover e modificar propriedades das salas gerenciada pelo bot.</br>

## 📝 Como usar

#### Download
- Certifique-se de ter a última versão do node instalada em seu computador. 
  - Você pode baixar a última versão do bot encontrada em [releases](https://github.com/debelzak/coala-bot/releases).
  - Ou, com o git instalado, clonar o repositório utilizando o comando
```shell
git clone https://github.com/debelzak/coala-bot
```

#### Arquivo .env
- Deverá ser criado um arquivo `.env` na pasta raíz do projeto. Nele serão armazenadas quaisquer informações sensíveis, como por exemplo, o token de acesso do bot.
  - O arquivo `.env.example` é um template de tudo que deve estar presente no arquivo `.env`.
- Crie uma cópia do arquivo `.env.example`, e edite com as informações necessárias.
```shell
cp .env.example .env
```

#### Iniciando bot
- Você pode optar por utilizar o node diretamente de seu ambiente, ou utilizar o docker.

##### Usando o Node
```shell
npm install
npm start
```

##### Usando o Docker
```shell
docker-compose up -d
```

## 🌟 Tecnologias utilizadas
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [SQLite](https://www.sqlite.org/)
- [Discord.js](https://discord.js.org/)
- [Docker](https://www.docker.com/)