import styles from "./page.module.css";

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

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Compras coletivas que{" "}
            <span className={styles.highlight}>transformam</span> sua
            comunidade
          </h1>
          <p className={styles.heroDescription}>
            Ajude líderes comunitários a gerenciar compras coletivas,
            permitindo que membros da comunidade comprem itens a preços mais
            baixos do que nas lojas normais, com entrega direto na porta de
            casa através de um sistema de entrega local.
          </p>
          <div className={styles.heroCta}>
            <button className={styles.ctaButtonLarge}>Criar conta gratuita</button>
            <button className={styles.secondaryButton}>Saiba mais</button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.gradientBlob}></div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefits}>
        <div className={styles.benefitsContent}>
          <h2 className={styles.sectionTitle}>
            Por que escolher o CoopEra?
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
          <button className={styles.ctaButtonLarge}>Criar conta gratuita</button>
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
