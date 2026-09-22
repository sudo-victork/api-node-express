# API REST — Node.js e Express

API REST desenvolvida como projeto de estudo durante minha formação em Ciência da Computação.

## Tecnologias

* JavaScript
* Node.js
* Express

## Funcionalidades

* Criar registros
* Listar registros
* Consultar registro por ID
* Atualizar registros
* Excluir registros

## Como executar

```bash
git clone <url-do-repositorio>
cd nome-do-projeto
npm install
npm run dev
```

## Rotas

| Método | Rota         | Descrição            |
| ------ | ------------ | -------------------- |
| GET    | `/items`     | Lista os registros   |
| GET    | `/items/:id` | Consulta um registro |
| POST   | `/items`     | Cria um registro     |
| PUT    | `/items/:id` | Atualiza um registro |
| DELETE | `/items/:id` | Remove um registro   |

## Objetivo

Projeto desenvolvido para praticar desenvolvimento de APIs REST, organização de código e utilização do framework Express.
