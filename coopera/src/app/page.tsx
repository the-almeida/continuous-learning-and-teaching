import styles from "./page.module.css";
import { ThemeToggle } from "./components/ThemeToggle";
import { promotionalOffers } from "./data/offers";

export default function Home() {
  return (
    <div className={styles.container}>
      <ThemeToggle />

      {/* WHY — Hero Section: The core belief and mission */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.whyLabel}>Por que existimos</span>
          <h1 className={styles.heroTitle}>
            Acreditamos que toda comunidade
            <span className={styles.highlight}> merece acesso justo </span>
            ao poder das compras coletivas
          </h1>
          <p className={styles.heroSubtitle}>
            Comunidades unidas compram mais barato, recebem em casa e fortalecem
            laços. CoopEra nasceu para tornar isso acessível a todos os líderes
            comunitários, independente do tamanho da sua comunidade.
          </p>
          <div className={styles.heroActions}>
            <a href="#criar-conta" className={styles.ctaButton}>
              Criar conta gratuita
            </a>
            <a href="#como-funciona" className={styles.secondaryButton}>
              Entender a missão
            </a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
        </div>
      </section>

      {/* HOW — Approach Section: The principles that deliver on the WHY */}
      <section className={styles.howSection} id="como-funciona">
        <div className={styles.howContent}>
          <span className={styles.sectionLabel}>Como fazemos isso</span>
          <h2 className={styles.sectionTitle}>
            Três pilares que transformam comunidades
          </h2>
          <p className={styles.sectionSubtitle}>
            Nossa abordagem combina tecnologia acessível, liderança local e
            transparência total para que o poder coletivo chegue a todos.
          </p>
          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>⚡</div>
              <h3 className={styles.pillarTitle}>Poder Coletivo</h3>
              <p className={styles.pillarText}>
                Unimos os pedidos de todos os membros para negociar preços que
                nenhum consumidor individual conseguiria sozinho.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>🌱</div>
              <h3 className={styles.pillarTitle}>Liderança Local</h3>
              <p className={styles.pillarText}>
                Damos às lideranças comunitárias as ferramentas para organizar,
                gerenciar e crescer com autonomia e confiança.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>🔍</div>
              <h3 className={styles.pillarTitle}>Transparência Total</h3>
              <p className={styles.pillarText}>
                Cada pedido, cada preço e cada entrega é acompanhado em tempo
                real por líderes e membros da comunidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT — Features Section: The actual product and services */}
      <section className={styles.features}>
        <span className={styles.sectionLabel}>O que oferecemos</span>
        <h2 className={styles.sectionTitle}>Recursos que fazem a diferença</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3 className={styles.featureTitle}>Economia Real</h3>
            <p className={styles.featureText}>
              Preços até 30% menores através do poder das compras coletivas
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚚</div>
            <h3 className={styles.featureTitle}>Entrega na Porta</h3>
            <p className={styles.featureText}>
              Sistema de entrega local traz comodidade diretamente até você
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Gestão Simplificada</h3>
            <p className={styles.featureText}>
              Catálogos, pedidos e relatórios em um painel intuitivo para líderes
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤝</div>
            <h3 className={styles.featureTitle}>Comunidade Forte</h3>
            <p className={styles.featureText}>
              Conecta pessoas, fortalece laços e gera impacto local real
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📱</div>
            <h3 className={styles.featureTitle}>Rastreamento em Tempo Real</h3>
            <p className={styles.featureText}>
              Membros acompanham seus pedidos do catálogo até a entrega
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureTitle}>Segurança Garantida</h3>
            <p className={styles.featureText}>
              Pagamentos protegidos e dados da comunidade sempre seguros
            </p>
          </div>
        </div>
      </section>

      {/* Promotional Offers Section */}
      <section className={styles.offersSection}>
        <div className={styles.offersContent}>
          <span className={styles.sectionLabelLight}>Ofertas em destaque</span>
          <h2 className={styles.offersSectionTitle}>
            Promoções disponíveis agora na plataforma
          </h2>
          <p className={styles.offersSectionSubtitle}>
            Aproveite as ofertas exclusivas para novas comunidades e líderes que
            querem começar a economizar hoje.
          </p>
          <div className={styles.offersGrid}>
            {promotionalOffers.map((offer) => (
              <div
                key={offer.id}
                className={`${styles.offerCard} ${offer.highlight ? styles.offerCardHighlight : ""}`}
              >
                <div className={styles.offerHeader}>
                  <span className={styles.offerBadge}>{offer.badge}</span>
                  <span className={styles.offerDiscount}>{offer.discount}</span>
                </div>
                <h3 className={styles.offerTitle}>{offer.title}</h3>
                <p className={styles.offerDescription}>{offer.description}</p>
                {offer.validUntil && (
                  <p className={styles.offerValidity}>
                    Válido até {offer.validUntil}
                  </p>
                )}
                <a href="#criar-conta" className={styles.offerCta}>
                  {offer.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — Step-by-step */}
      <section className={styles.steps}>
        <div className={styles.stepsContent}>
          <span className={styles.sectionLabel}>Passo a passo</span>
          <h2 className={styles.sectionTitle}>Como funciona na prática</h2>
          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>1</div>
              <div>
                <h3 className={styles.stepTitle}>Líderes criam catálogos</h3>
                <p className={styles.stepDescription}>
                  Organize produtos, defina preços e compartilhe com a comunidade
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>2</div>
              <div>
                <h3 className={styles.stepTitle}>Membros fazem pedidos</h3>
                <p className={styles.stepDescription}>
                  Navegue pelos produtos, escolha o que precisa e faça seu pedido
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>3</div>
              <div>
                <h3 className={styles.stepTitle}>Rastreamento em tempo real</h3>
                <p className={styles.stepDescription}>
                  Acompanhe seu pedido do início até a entrega na sua porta
                </p>
              </div>
            </div>
          </div>
          <div className={styles.stepHighlight}>
            <span className={styles.stepHighlightText}>
              Economize até 30% comparado aos preços de varejo tradicional
            </span>
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
            <h4 className={styles.crowdfundingTitle}>
              🚀 Ajude a Construir o CoopEra
            </h4>
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
              © 2026 CoopEra. Feito com ❤️ para comunidades.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
