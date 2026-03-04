export interface ScrapedOffer {
  id: string;
  sourceGroup: string;
  category: string;
  title: string;
  price: string;
  originalPrice?: string;
  description: string;
  unit: string;
  location: string;
  postedAt: string;
  isNew?: boolean;
  minOrder?: string;
}

export const scrapedOffers: ScrapedOffer[] = [
  {
    id: "laranja-floripa",
    sourceGroup: "Compras Coletivas Floripa 🍊",
    category: "Frutas",
    title: "Caixa de Laranja Lima",
    price: "R$ 25,00",
    originalPrice: "R$ 42,00",
    description:
      "Caixa com 40 unidades, direto do produtor. Colheita da semana.",
    unit: "caixa 40 un.",
    location: "Florianópolis, SC",
    postedAt: "há 1 hora",
    isNew: true,
    minOrder: "mín. 10 caixas",
  },
  {
    id: "frango-floripa",
    sourceGroup: "Mercado Coletivo SC",
    category: "Carnes",
    title: "Frango Inteiro Congelado",
    price: "R$ 14,90",
    originalPrice: "R$ 23,00",
    description: "Procedência garantida. Retirada quinta ou entrega sexta.",
    unit: "por kg",
    location: "Florianópolis, SC",
    postedAt: "há 3 horas",
    isNew: true,
    minOrder: "mín. 20 kg",
  },
  {
    id: "oleo-soja-floripa",
    sourceGroup: "Grupo Economia Floripa Norte",
    category: "Alimentos",
    title: "Óleo de Soja 900ml",
    price: "R$ 4,50",
    originalPrice: "R$ 7,20",
    description: "Fardo 20 un. Marca Aurora. Entrega na quarta-feira.",
    unit: "por unidade",
    location: "Florianópolis, SC",
    postedAt: "há 5 horas",
    minOrder: "mín. 2 fardos",
  },
  {
    id: "leite-floripa",
    sourceGroup: "Compras Coletivas Lagoa da Conceição",
    category: "Laticínios",
    title: "Leite Integral UHT 1L",
    price: "R$ 3,20",
    originalPrice: "R$ 5,50",
    description: "Caixa com 12 unidades. Marca Parmalat. Validade longa.",
    unit: "por unidade",
    location: "Florianópolis, SC",
    postedAt: "há 8 horas",
    minOrder: "mín. 2 caixas",
  },
  {
    id: "arroz-trindade",
    sourceGroup: "Compras Coletivas Trindade & Pantanal",
    category: "Alimentos",
    title: "Arroz Agulhinha Tipo 1 5kg",
    price: "R$ 18,00",
    originalPrice: "R$ 29,90",
    description: "Saco 5kg. Marca Camil. Pedido se encerra domingo.",
    unit: "por saco",
    location: "Florianópolis, SC",
    postedAt: "há 10 horas",
    isNew: false,
    minOrder: "mín. 4 sacos",
  },
  {
    id: "sabao-cachoeira",
    sourceGroup: "Grupo Economia Cachoeira do Bom Jesus",
    category: "Limpeza",
    title: "Sabão em Pó Omo 1kg",
    price: "R$ 9,90",
    originalPrice: "R$ 16,00",
    description: "Caixa com 12 unidades. Frete incluso acima de 5 caixas.",
    unit: "por unidade",
    location: "Florianópolis, SC",
    postedAt: "há 12 horas",
    minOrder: "mín. 3 caixas",
  },
];
