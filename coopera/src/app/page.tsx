import styles from "./page.module.css";

const promoOffers = [
  {
    icon: "🛒",
    category: "Alimentação",
    name: "Cesta Básica Comunitária",
    organizer: "Dona Maria — Vila Esperança",
    description: "Arroz 5kg, feijão 2kg, azeite, açúcar, macarrão e outros itens essenciais.",
    price: "R$ 89,90",
    participants: 14,
    minParticipants: 20,
    deadline: "3 dias",
  },
  {
    icon: "🥩",
    category: "Açougue",
    name: "Kit Carnes da Semana",
    organizer: "João Açougue — Bairro Norte",
    description: "Frango 3kg, carne moída 2kg, linguiça 1kg. Corte e embalagem inclusos.",
    price: "R$ 74,50",
    participants: 31,
    minParticipants: 25,
    deadline: "1 dia",
  },
  {
    icon: "🧴",
    category: "Limpeza & Higiene",
    name: "Kit Limpeza Mensal",
    organizer: "Cooperativa do Bairro Sul",
    description: "Detergente, sabão em pó, desinfetante, amaciante e papel higiênico.",
    price: "R$ 49,90",
    participants: 8,
    minParticipants: 15,
    deadline: "5 dias",
  },
  {
    icon: "🥦",
    category: "Hortifruti",
    name: "Caixa de Hortifruti",
    organizer: "Sítio do Pedro — Direto do Campo",
    description: "Caixa mista com frutas e legumes da estação, direto do produtor.",
    price: "R$ 55,00",
    participants: 19,
    minParticipants: 20,
    deadline: "2 dias",
  },
];

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>CoopEra</div>
          <a href="#ofertas" className={styles.ctaButton}>
            Ver todas as ofertas
          </a>
        </div>
      </nav>

      {/* WHY — Propósito */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.whyBadge}>Nosso Propósito</div>
          <h1 className={styles.heroTitle}>
            Toda pessoa merece encontrar{" "}
            <span className={styles.highlight}>compras coletivas</span> perto
            de si, sem precisar estar no grupo certo do WhatsApp
          </h1>
          <p className={styles.heroDescription}>
            Milhares de compras coletivas acontecem todo dia no WhatsApp. A
            maioria das pessoas não tem acesso porque não conhece o
            administrador certo. A CoopEra muda isso.
          </p>
          <div className={styles.heroCta}>
            <a href="#ofertas" className={styles.ctaButtonLarge}>
              Ver ofertas ativas
            </a>
            <a href="#como-funciona" className={styles.secondaryButton}>
              Como funciona?
            </a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.gradientBlob}></div>
        </div>
      </section>

      {/* HOW — Como funciona */}
      <section id="como-funciona" className={styles.how}>
        <div className={styles.howContent}>
          <div className={styles.sectionBadge}>Como Funciona</div>
          <h2 className={styles.sectionTitle}>
            Compras coletivas do WhatsApp, organizadas para você
          </h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>👀</div>
              <h3 className={styles.stepTitle}>Monitoramos os grupos</h3>
              <p className={styles.stepDescription}>
                A CoopEra monitora constantemente os maiores e melhores grupos
                de compras coletivas de Florianópolis.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>📋</div>
              <h3 className={styles.stepTitle}>Organizamos as ofertas</h3>
              <p className={styles.stepDescription}>
                As ofertas são extraídas e organizadas de forma clara, para
                você encontrar as melhores opções com facilidade.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>🛒</div>
              <h3 className={styles.stepTitle}>Você escolhe e compra</h3>
              <p className={styles.stepDescription}>
                Adicione os produtos ao carrinho e efetue o pagamento — rápido
                e seguro, sem precisar entrar em nenhum grupo.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>04</div>
              <div className={styles.stepIcon}>📦</div>
              <h3 className={styles.stepTitle}>Aguarde em casa</h3>
              <p className={styles.stepDescription}>
                Seus produtos chegam até você. O frete é combinado e pago
                diretamente na entrega.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT — O que você encontra */}
      <section className={styles.benefits}>
        <div className={styles.benefitsContent}>
          <div className={styles.sectionBadge}>O Que Você Encontra</div>
          <h2 className={styles.sectionTitle}>
            Tudo que você precisa para participar de compras coletivas
          </h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🗂️</div>
              <h3 className={styles.benefitTitle}>Ofertas Organizadas</h3>
              <p className={styles.benefitDescription}>
                Todas as compras coletivas da sua região em um único lugar,
                sempre atualizadas e fáceis de comparar.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>💰</div>
              <h3 className={styles.benefitTitle}>Preços de Atacado</h3>
              <p className={styles.benefitDescription}>
                Acesse preços que só grupos de compra conseguem — sem precisar
                negociar ou conhecer o administrador.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🤝</div>
              <h3 className={styles.benefitTitle}>Grupos Verificados</h3>
              <p className={styles.benefitDescription}>
                Só exibimos ofertas de grupos ativos e com histórico de
                entregas confirmadas na plataforma.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>📲</div>
              <h3 className={styles.benefitTitle}>Sempre Atualizado</h3>
              <p className={styles.benefitDescription}>
                As ofertas são extraídas diretamente dos grupos de WhatsApp,
                garantindo informações sempre frescas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ofertas Ativas */}
      <section id="ofertas" className={styles.offers}>
        <div className={styles.offersContent}>
          <div className={styles.sectionBadge}>Ofertas Ativas</div>
          <h2 className={styles.sectionTitle}>
            Compras coletivas abertas agora
          </h2>
          <p className={styles.sectionDescription}>
            Ofertas agregadas dos grupos de WhatsApp monitorados pela CoopEra.
            Vagas limitadas — garanta a sua!
          </p>
          <div className={styles.offersGrid}>
            {promoOffers.map((offer) => {
              const filled = Math.round(
                (offer.participants / offer.minParticipants) * 100
              );
              const isGoalMet = offer.participants >= offer.minParticipants;
              return (
                <div key={offer.name} className={styles.offerCard}>
                  <div className={styles.offerHeader}>
                    <span className={styles.offerIcon}>{offer.icon}</span>
                    <span className={styles.offerCategory}>
                      {offer.category}
                    </span>
                    <span className={styles.offerPrice}>{offer.price}</span>
                  </div>
                  <h3 className={styles.offerName}>{offer.name}</h3>
                  <p className={styles.offerOrganizer}>{offer.organizer}</p>
                  <p className={styles.offerDescription}>{offer.description}</p>
                  <div className={styles.offerMeta}>
                    <div className={styles.offerProgress}>
                      <div className={styles.offerProgressLabel}>
                        <span>
                          {offer.participants}/{offer.minParticipants}{" "}
                          participantes
                        </span>
                        {isGoalMet && (
                          <span className={styles.goalMet}>✓ Meta atingida</span>
                        )}
                      </div>
                      <div className={styles.offerProgressBar}>
                        <div
                          className={styles.offerProgressFill}
                          style={{ width: `${Math.min(filled, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={styles.offerDeadline}>
                      ⏱ Encerra em {offer.deadline}
                    </div>
                  </div>
                  <button className={styles.offerButton}>
                    Adicionar ao carrinho
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA para administradores */}
      <section className={styles.adminCta}>
        <div className={styles.adminCtaContent}>
          <h2 className={styles.ctaTitle}>
            Você administra um grupo de compras coletivas?
          </h2>
          <p className={styles.ctaDescription}>
            Em breve, administradores poderão cadastrar suas ofertas diretamente
            na plataforma e alcançar muito mais compradores. Deixe seu contato
            para ser o primeiro a saber.
          </p>
          <form className={styles.emailForm} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="seu@email.com"
              className={styles.emailInput}
            />
            <button type="submit" className={styles.ctaButtonLarge}>
              Quero ser avisado
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>CoopEra</div>
          <p className={styles.footerText}>
            Compras coletivas do WhatsApp, organizadas para você — Florianópolis
          </p>
        </div>
      </footer>
    </div>
  );
}
