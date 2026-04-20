import type { Category, TransactionType } from '@/types/transaction';

// keyword → category name (normalized, no accents/spaces)
const RULES: Record<string, string[]> = {
  alimentacao: [
    'mercado', 'supermercado', 'ifood', 'uber eats', 'rappi', 'restaurante',
    'lanche', 'pizza', 'hamburguer', 'mcdonalds', 'burger king', 'subway',
    'padaria', 'acougue', 'hortifruti', 'carrefour', 'extra', 'pao de acucar',
    'atacadao', 'assai', 'comida', 'almoco', 'jantar', 'cafe', 'suco', 'delivery',
    'churrasco', 'sushi', 'pastel', 'feira',
  ],
  transporte: [
    'uber', '99pop', 'cabify', 'onibus', 'metro', 'trem', 'gasolina',
    'combustivel', 'shell', 'ipiranga', 'posto', 'ipva', 'dpvat', 'multa',
    'pedagio', 'estacionamento', 'passagem', 'brt', 'bilhete unico',
  ],
  saude: [
    'farmacia', 'droga', 'drogaria', 'remedio', 'medico', 'hospital', 'clinica',
    'consulta', 'exame', 'dentista', 'plano de saude', 'unimed', 'amil',
    'sulamerica', 'hapvida', 'laboratorio', 'vacina', 'fisioterapia',
  ],
  educacao: [
    'escola', 'faculdade', 'universidade', 'curso', 'mensalidade', 'livro',
    'material escolar', 'udemy', 'alura', 'coursera', 'apostila', 'colegio',
    'formacao', 'treinamento', 'certificado',
  ],
  lazer: [
    'cinema', 'teatro', 'show', 'ingresso', 'spotify', 'netflix', 'prime video',
    'disney', 'hbo', 'xbox', 'playstation', 'steam', 'jogo', 'clube',
    'academia', 'smartfit', 'bodytech', 'viagem', 'hotel', 'airbnb',
  ],
  moradia: [
    'aluguel', 'condominio', 'iptu', 'agua', 'luz', 'energia', 'gas',
    'internet', 'net', 'claro', 'vivo', 'tim', 'oi', 'fibra', 'manutencao',
    'reforma', 'moveis', 'eletrodomestico',
  ],
  vestuario: [
    'roupa', 'calcado', 'tenis', 'camisa', 'calca', 'vestido',
    'renner', 'riachuelo', 'c&a', 'hering', 'zara', 'shein', 'shopee',
    'camiseta', 'bermuda', 'casaco',
  ],
  salario: [
    'salario', 'pagamento', 'holerite', 'contracheque', 'folha', 'remuneracao',
    'vencimento', 'pro labore',
  ],
  freelance: [
    'freelance', 'freela', 'projeto', 'consultoria', 'servico', 'honorario',
    'prestacao', 'autonomo', 'pj', 'nota fiscal',
  ],
  investimentos: [
    'dividendo', 'rendimento', 'juros', 'cdb', 'tesouro', 'fundo', 'acao',
    'bolsa', 'b3', 'lci', 'lca', 'poupanca', 'resgate', 'aporte',
  ],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toCategoryKey(name: string): string {
  return normalize(name).replace(/[^a-z0-9]/g, '');
}

export function suggestCategory(
  description: string,
  type: TransactionType,
  categories: Category[]
): Category | null {
  if (description.trim().length < 3) return null;

  const normalizedDesc = normalize(description);
  const available = categories.filter(c => c.type === type);

  let bestMatch: Category | null = null;
  let bestScore = 0;

  for (const category of available) {
    const key = toCategoryKey(category.name);
    const keywords = RULES[key] ?? [];

    for (const keyword of keywords) {
      if (normalizedDesc.includes(normalize(keyword))) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
  }

  return bestMatch;
}
