const Database = require('better-sqlite3');
const db = new Database('pdv.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS comanda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'aberta',
    aberta_em TEXT NOT NULL DEFAULT (datetime('now')),
    fechada_em TEXT
  )
`);
try {
  db.exec('ALTER TABLE comanda ADD COLUMN forma_pagamento TEXT');
} catch (e) {
  // coluna já existe, ignora
}

db.exec(`
  CREATE TABLE IF NOT EXISTS item_comanda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comanda_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    FOREIGN KEY (comanda_id) REFERENCES comanda(id),
    FOREIGN KEY (produto_id) REFERENCES produto(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS entrada_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    criada_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (produto_id) REFERENCES produto(id)
  )
`);

module.exports = db;