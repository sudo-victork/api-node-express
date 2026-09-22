const express = require('express');
const app = express();
const db = require('./database')
app.use(express.json()); // permite receber JSON no corpo das requisições
app.use(express.static('public'));

//Criar produto
app.post('/produtos', (req, res) => {
    const {nome, preco, estoque_atual} = req.body;

    if(!nome || preco === undefined){
    return res.status(400).json({ erro: 'nome e preco são obrigatórios' });
    }
    const stmt = db.prepare(
        'INSERT INTO produto (nome, preco, estoque_atual) VALUES (?, ?, ?)'
    )
    const resultado = stmt.run(nome, preco, estoque_atual ?? 0);
    
   res.status(201).json({ id: resultado.lastInsertRowid, nome, preco, estoque_atual: estoque_atual ?? 0 });
});
// Listar produtos
app.get('/produtos', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produto').all();
  res.json(produtos);
});

// Buscar produto por id
app.get('/produtos/:id', (req, res) => {
  const produto = db.prepare('SELECT * FROM produto WHERE id = ?').get(req.params.id);

  if (!produto) {
    return res.status(404).json({ erro: 'produto não encontrado' });
  }

  res.json(produto);
});
// Atualizar produto
app.put('/produtos/:id', (req, res) => {
  const { nome, preco, estoque_atual, ativo } = req.body;

  const produtoExistente = db.prepare('SELECT * FROM produto WHERE id = ?').get(req.params.id);
  if (!produtoExistente) {
    return res.status(404).json({ erro: 'produto não encontrado' });
  }

  const stmt = db.prepare(
    'UPDATE produto SET nome = ?, preco = ?, estoque_atual = ?, ativo = ? WHERE id = ?'
  );

  stmt.run(
    nome ?? produtoExistente.nome,
    preco ?? produtoExistente.preco,
    estoque_atual ?? produtoExistente.estoque_atual,
    ativo ?? produtoExistente.ativo,
    req.params.id
  );

  res.json({ ...produtoExistente, nome, preco, estoque_atual, ativo });
});

// Deletar produto
app.delete('/produtos/:id', (req, res) => {
  const resultado = db.prepare('DELETE FROM produto WHERE id = ?').run(req.params.id);

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: 'produto não encontrado' });
  }

  res.status(204).send();
});

// Abrir comanda
app.post('/comandas', (req, res) => {
  const stmt = db.prepare("INSERT INTO comanda (status) VALUES ('aberta')");
  const resultado = stmt.run();

  res.status(201).json({ id: resultado.lastInsertRowid, status: 'aberta' });
});

// Adicionar item na comanda
app.post('/comandas/:id/itens', (req, res) => {
  const { produto_id, quantidade } = req.body;

  if (!produto_id || !quantidade) {
    return res.status(400).json({ erro: 'produto_id e quantidade são obrigatórios' });
  }

  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }
  if (comanda.status !== 'aberta') {
    return res.status(400).json({ erro: 'comanda já está fechada' });
  }

  const produto = db.prepare('SELECT * FROM produto WHERE id = ?').get(produto_id);
  if (!produto) {
    return res.status(404).json({ erro: 'produto não encontrado' });
  }

  const stmt = db.prepare(
    'INSERT INTO item_comanda (comanda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
  );
  const resultado = stmt.run(req.params.id, produto_id, quantidade, produto.preco);

  res.status(201).json({
    id: resultado.lastInsertRowid,
    comanda_id: Number(req.params.id),
    produto_id,
    quantidade,
    preco_unitario: produto.preco
  });
});

// Listar itens de uma comanda (com nome do produto e total)
app.get('/comandas/:id/itens', (req, res) => {
  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }

  const itens = db.prepare(`
    SELECT item_comanda.id, produto.nome, item_comanda.quantidade, item_comanda.preco_unitario
    FROM item_comanda
    JOIN produto ON produto.id = item_comanda.produto_id
    WHERE item_comanda.comanda_id = ?
  `).all(req.params.id);

  const total = itens.reduce((soma, item) => soma + item.quantidade * item.preco_unitario, 0);

  res.json({ comanda, itens, total });
});

// Fechar comanda
app.post('/comandas/:id/fechar', (req, res) => {
  const { forma_pagamento } = req.body;

  if (!forma_pagamento) {
    return res.status(400).json({ erro: 'forma_pagamento é obrigatória' });
  }

  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }
  if (comanda.status !== 'aberta') {
    return res.status(400).json({ erro: 'comanda já está fechada' });
  }

  const itens = db.prepare('SELECT * FROM item_comanda WHERE comanda_id = ?').all(req.params.id);

  const atualizarEstoque = db.prepare(
    'UPDATE produto SET estoque_atual = estoque_atual - ? WHERE id = ?'
  );
  for (const item of itens) {
    atualizarEstoque.run(item.quantidade, item.produto_id);
  }

  db.prepare(
    "UPDATE comanda SET status = 'fechada', fechada_em = datetime('now'), forma_pagamento = ? WHERE id = ?"
  ).run(forma_pagamento, req.params.id);

  const total = itens.reduce((soma, item) => soma + item.quantidade * item.preco_unitario, 0);

  res.json({ id: Number(req.params.id), status: 'fechada', forma_pagamento, total });
});

// Remover item da comanda
app.delete('/comandas/:id/itens/:itemId', (req, res) => {
  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }
  if (comanda.status !== 'aberta') {
    return res.status(400).json({ erro: 'comanda já está fechada' });
  }

  const resultado = db.prepare(
    'DELETE FROM item_comanda WHERE id = ? AND comanda_id = ?'
  ).run(req.params.itemId, req.params.id);

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: 'item não encontrado nessa comanda' });
  }

  res.status(204).send();
});

// Cancelar comanda
app.post('/comandas/:id/cancelar', (req, res) => {
  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }
  if (comanda.status !== 'aberta') {
    return res.status(400).json({ erro: 'comanda já está fechada ou cancelada' });
  }

  db.prepare("UPDATE comanda SET status = 'cancelada', fechada_em = datetime('now') WHERE id = ?")
    .run(req.params.id);

  res.json({ id: Number(req.params.id), status: 'cancelada' });
});

// entrada no estoque
app.post('/produtos/:id/entrada', (req, res) => {
  const { quantidade } = req.body;

  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'quantidade deve ser maior que zero' });
  }

  const produto = db.prepare('SELECT * FROM produto WHERE id = ?').get(req.params.id);
  if (!produto) {
    return res.status(404).json({ erro: 'produto não encontrado' });
  }

  db.prepare('INSERT INTO entrada_estoque (produto_id, quantidade) VALUES (?, ?)')
    .run(req.params.id, quantidade);

  db.prepare('UPDATE produto SET estoque_atual = estoque_atual + ? WHERE id = ?')
    .run(quantidade, req.params.id);

  const produtoAtualizado = db.prepare('SELECT * FROM produto WHERE id = ?').get(req.params.id);

  res.status(201).json(produtoAtualizado);
});

//geracao de comandas
app.get('/comandas/:id/cupom', (req, res) => {
  const comanda = db.prepare('SELECT * FROM comanda WHERE id = ?').get(req.params.id);
  if (!comanda) {
    return res.status(404).json({ erro: 'comanda não encontrada' });
  }

  const itens = db.prepare(`
    SELECT produto.nome, item_comanda.quantidade, item_comanda.preco_unitario
    FROM item_comanda
    JOIN produto ON produto.id = item_comanda.produto_id
    WHERE item_comanda.comanda_id = ?
  `).all(req.params.id);

  const total = itens.reduce((soma, item) => soma + item.quantidade * item.preco_unitario, 0);

  let cupom = '===== PDV ADEGA =====\n';
  cupom += `Comanda #${comanda.id}\n`;
  cupom += `Data: ${comanda.aberta_em}\n`;
  cupom += '----------------------\n';

  itens.forEach(item => {
    const subtotal = (item.quantidade * item.preco_unitario).toFixed(2);
    cupom += `${item.quantidade}x ${item.nome} - R$ ${subtotal}\n`;
  });

  cupom += '----------------------\n';
  cupom += `TOTAL: R$ ${total.toFixed(2)}\n`;
  if (comanda.forma_pagamento) {
    cupom += `Pagamento: ${comanda.forma_pagamento}\n`;
  }
  cupom += '======================';

  res.type('text/plain').send(cupom);
});


app.get('/', (req, res) => {
  res.send('PDV Adega rodando!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
