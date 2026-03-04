import styles from "./page.module.css";

const promoOffers = [
  {
    icon: "🛒",
    category: "Alimentação",
    name: "Cesta Básica Comunitária",
    description:
      "Kit completo com arroz, feijão, azeite, açúcar, macarrão e outros itens essenciais.",
    discount: 30,
    participants: 14,
    minParticipants: 20,
    deadline: "3 dias",
  },
  {
    icon: "🏠",
    category: "Eletrodomésticos",
    name: "Kit Casa Nova",
    description:
      "Geladeira Frost Free 350L + fogão 4 bocas com forno. Entrega e instalação inclusas.",
    discount: 25,
    participants: 7,
    minParticipants: 10,
    deadline: "7 dias",
  },
  {
    icon: "📚",
    category: "Educação",
    name: "Material Escolar 2026",
    description:
      "Kit completo para o ano letivo: cadernos, lápis, canetas, régua, mochila e muito mais.",
    discount: 40,
    participants: 22,
    minParticipants: 15,
    deadline: "5 dias",
  },
  {
    icon: "🔥",
    category: "Gás & Energia",
    name: "Gás de Cozinha P13",
    description:
      "Botijão de gás 13kg com entrega agendada. Recorrência mensal disponível.",
    discount: 20,
    participants: 28,
    minParticipants: 30,
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
          <button className={styles.ctaButton}>Criar conta gratuita</button>
        </div>
      </nav>

      {/* WHY — Purpose & Belief */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.whyBadge}>Nosso Propósito</div>
          <h1 className={styles.heroTitle}>
            Acreditamos que toda comunidade merece acesso a{" "}
            <span className={styles.highlight}>produtos de qualidade</span>
          </h1>
          <p className={styles.heroDescription}>
            Nenhuma família deveria pagar caro por necessidades básicas.
            Existimos para mudar isso — unindo vizinhos, fortalecendo
            comunidades e tornando o poder coletivo acessível a todos,
            independentemente de renda ou localização.
          </p>
          <div className={styles.heroCta}>
            <button className={styles.ctaButtonLarge}>
              Transforme sua comunidade
            </button>
            <button className={styles.secondaryButton}>Como funciona?</button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.gradientBlob}></div>
        </div>
      </section>

      {/* HOW — The Process */}
      <section className={styles.how}>
        <div className={styles.howContent}>
          <div className={styles.sectionBadge}>Como Fazemos</div>
          <h2 className={styles.sectionTitle}>
            Como construímos uma comunidade mais forte
          </h2>
          <p className={styles.sectionDescription}>
            Unimos líderes e moradores em um modelo simples de compra coletiva
            que gera benefícios reais para todos.
          </p>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>🧑‍🤝‍🧑</div>
              <h3 className={styles.stepTitle}>Líderes criam grupos</h3>
              <p className={styles.stepDescription}>
                Líderes comunitários organizam grupos de compra e definem as
                necessidades locais.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>👥</div>
              <h3 className={styles.stepTitle}>Membros participam</h3>
              <p className={styles.stepDescription}>
                Vizinhos entram no grupo, conferem as ofertas e fazem seus
                pedidos com poucos cliques.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>💸</div>
              <h3 className={styles.stepTitle}>Poder coletivo negocia</h3>
              <p className={styles.stepDescription}>
                O volume coletivo garante os melhores preços — muito abaixo do
                que cada um conseguiria sozinho.
              </p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>04</div>
              <div className={styles.stepIcon}>🚚</div>
              <h3 className={styles.stepTitle}>Entrega na sua porta</h3>
              <p className={styles.stepDescription}>
                Os produtos chegam direto na residência de cada membro, pelo
                sistema de entrega local do CoopEra.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT — The Platform */}
      <section className={styles.benefits}>
        <div className={styles.benefitsContent}>
          <div className={styles.sectionBadge}>O Que Oferecemos</div>
          <h2 className={styles.sectionTitle}>
            Uma plataforma completa para sua comunidade
          </h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>💰</div>
              <h3 className={styles.benefitTitle}>Economia Real</h3>
              <p className={styles.benefitDescription}>
                Compre itens a preços significativamente mais baixos do que nas
                lojas tradicionais através do poder das compras coletivas.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🏠</div>
              <h3 className={styles.benefitTitle}>Entrega na Porta</h3>
              <p className={styles.benefitDescription}>
                Receba seus produtos diretamente em casa através do nosso
                sistema de entrega local, sem sair de casa.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🤝</div>
              <h3 className={styles.benefitTitle}>Comunidade Forte</h3>
              <p className={styles.benefitDescription}>
                Fortaleça os laços comunitários enquanto economiza juntos,
                criando uma rede de apoio local.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>📱</div>
              <h3 className={styles.benefitTitle}>Fácil de Usar</h3>
              <p className={styles.benefitDescription}>
                Interface intuitiva para líderes gerenciarem compras coletivas
                e membros participarem com apenas alguns cliques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Offers */}
      <section className={styles.offers}>
        <div className={styles.offersContent}>
          <div className={styles.sectionBadge}>Ofertas Ativas</div>
          <h2 className={styles.sectionTitle}>
            Compras coletivas abertas agora
          </h2>
          <p className={styles.sectionDescription}>
            Junte-se a grupos já formados e economize neste mês. As vagas são
            limitadas!
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
                    <span className={styles.offerDiscount}>
                      -{offer.discount}%
                    </span>
                  </div>
                  <h3 className={styles.offerName}>{offer.name}</h3>
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
                  <button className={styles.offerButton}>Participar</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaSectionContent}>
          <h2 className={styles.ctaTitle}>
            Pronto para transformar sua comunidade?
          </h2>
          <p className={styles.ctaDescription}>
            Comece agora e veja como as compras coletivas podem beneficiar
            todos na sua comunidade.
          </p>
          <button className={styles.ctaButtonLarge}>
            Criar conta gratuita
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>CoopEra</div>
          <p className={styles.footerText}>
            Transformando comunidades através de compras coletivas
          </p>
        </div>
      </footer>
    </div>
  );
}
