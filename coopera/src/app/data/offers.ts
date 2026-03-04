export interface Offer {
  id: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  highlight: boolean;
  discount: string;
  validUntil?: string;
}

export const promotionalOffers: Offer[] = [
  {
    id: "launch-3-months-free",
    badge: "🎉 Oferta de Lançamento",
    title: "3 meses grátis para novas comunidades",
    description:
      "Crie sua comunidade agora e experimente todos os recursos da plataforma sem pagar nada pelos primeiros 3 meses. Sem cartão de crédito.",
    cta: "Começar grátis",
    highlight: true,
    discount: "100% OFF",
    validUntil: "31/03/2026",
  },
  {
    id: "savings-guarantee",
    badge: "💰 Economia Garantida",
    title: "Até 30% de desconto nas primeiras compras",
    description:
      "Garantimos economia mínima de 30% em relação ao varejo tradicional nas suas primeiras 5 compras coletivas, ou devolvemos a diferença.",
    cta: "Ver condições",
    highlight: false,
    discount: "Até 30% OFF",
  },
  {
    id: "large-community-premium",
    badge: "🤝 Comunidades Grandes",
    title: "6 meses de plano premium para +50 membros",
    description:
      "Comunidades com mais de 50 membros ativos ganham acesso gratuito ao plano premium por 6 meses, incluindo relatórios avançados e suporte prioritário.",
    cta: "Ativar benefício",
    highlight: false,
    discount: "6 meses grátis",
    validUntil: "30/06/2026",
  },
  {
    id: "free-delivery",
    badge: "🚚 Frete Grátis",
    title: "Entrega gratuita nas 5 primeiras compras coletivas",
    description:
      "Suas primeiras 5 entregas coletivas são totalmente gratuitas para qualquer região atendida, sem valor mínimo de pedido.",
    cta: "Aproveitar agora",
    highlight: false,
    discount: "FRETE GRÁTIS",
  },
];
