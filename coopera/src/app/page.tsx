import styles from "./page.module.css";
import { ThemeToggle } from "./components/ThemeToggle";

export default function Home() {
  return (
    <div className={styles.container}>
      <ThemeToggle />
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Compras Coletivas que
            <span className={styles.highlight}> Transformam </span>
            Comunidades
          </h1>
          <p className={styles.heroSubtitle}>
            Gerencie compras coletivas de forma simples. Membros da comunidade 
            compram com menor custo e recebem em casa através de entregas locais.
          </p>
          <a href="#criar-conta" className={styles.ctaButton}>
            Criar conta gratuita
          </a>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
        </div>
      </section>

      {/* Brief Value Proposition Section */}
      <section className={styles.valueProp}>
        <div className={styles.valuePropContent}>
          <h2 className={styles.valuePropTitle}>
            Simples para líderes. Prático para a comunidade.
          </h2>
          <p className={styles.valuePropText}>
            Líderes comunitários enviam catálogos com facilidade. Membros 
            acompanham produtos e rastreiam pedidos em tempo real. Tudo em 
            um só lugar, tudo colaborativo.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Recursos que Fazem a Diferença</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3 className={styles.featureTitle}>Economia Real</h3>
            <p className={styles.featureText}>
              Preços menores através do poder das compras coletivas
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚚</div>
            <h3 className={styles.featureTitle}>Entrega na Porta</h3>
            <p className={styles.featureText}>
              Sistema de entrega local traz comodidade até você
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Gestão Simplificada</h3>
            <p className={styles.featureText}>
              Ferramentas intuitivas para líderes comunitários
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤝</div>
            <h3 className={styles.featureTitle}>Comunidade Forte</h3>
            <p className={styles.featureText}>
              Conecta pessoas e fortalece laços comunitários
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefits}>
        <div className={styles.benefitsContent}>
          <div className={styles.benefitsText}>
            <h2 className={styles.sectionTitle}>Como Funciona</h2>
            <div className={styles.benefitItem}>
              <div className={styles.benefitNumber}>1</div>
              <div>
                <h3 className={styles.benefitTitle}>Líderes criam catálogos</h3>
                <p className={styles.benefitDescription}>
                  Organize produtos, defina preços e compartilhe com a comunidade
                </p>
              </div>
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitNumber}>2</div>
              <div>
                <h3 className={styles.benefitTitle}>Membros fazem pedidos</h3>
                <p className={styles.benefitDescription}>
                  Navegue pelos produtos, escolha o que precisa e faça seu pedido
                </p>
              </div>
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitNumber}>3</div>
              <div>
                <h3 className={styles.benefitTitle}>Rastreamento em tempo real</h3>
                <p className={styles.benefitDescription}>
                  Acompanhe seu pedido do início até a entrega na sua porta
                </p>
              </div>
            </div>
            <div className={styles.benefitHighlight}>
              <span className={styles.benefitHighlightText}>
                Economize até 30% comparado aos preços de varejo tradicional
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerMain}>
            <h3 className={styles.footerTitle}>CoopEra</h3>
            <p className={styles.footerDescription}>
              Plataforma de compras coletivas que transforma comunidades, 
              conectando líderes e membros para economizar juntos.
            </p>
          </div>
          
          <div className={styles.crowdfunding}>
            <h4 className={styles.crowdfundingTitle}>🚀 Ajude a Construir o CoopEra</h4>
            <p className={styles.crowdfundingText}>
              Este projeto nasceu da proximidade com líderes comunitários e 
              membros de comunidades que conhecem as dificuldades de coletar 
              pedidos e facilitar a organização coletiva. Estamos construindo 
              uma solução colaborativa e precisamos do seu apoio!
            </p>
            <p className={styles.crowdfundingText}>
              Se você acredita na força das comunidades e quer ver esse projeto 
              crescer, considere apoiar nossa iniciativa. Juntos, podemos 
              fortalecer laços comunitários e gerar economia real para todos.
            </p>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopyright}>
              © 2025 CoopEra. Feito com ❤️ para comunidades.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
