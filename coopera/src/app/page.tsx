import styles from "./page.module.css";
import { ThemeToggle } from "./components/ThemeToggle";
import { scrapedOffers } from "./data/offers";

const categoryEmoji: Record<string, string> = {
  Frutas: "🍊",
  Carnes: "🥩",
  Alimentos: "🌾",
  Laticínios: "🥛",
  Limpeza: "🧹",
};

export default function Home() {
  return (
    <div className={styles.container}>
      <ThemeToggle />

      {/* WHY — Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.whyLabel}>Florianópolis · SC</span>
          <h1 className={styles.heroTitle}>
            As melhores ofertas dos grupos de
            <span className={styles.highlight}> compras coletivas </span>
            do WhatsApp de Floripa, em um só lugar
          </h1>
          <p className={styles.heroSubtitle}>
            Você não precisa entrar em dezenas de grupos para não perder uma
            promoção. CoopEra monitora os maiores grupos de compras coletivas
            de Florianópolis, organiza as ofertas e permite que você compre
            direto pela plataforma — entrega na sua casa.
          </p>
          <div className={styles.heroActions}>
            <a href="#ofertas" className={styles.ctaButton}>
              Ver promoções agora
            </a>
            <a href="#como-funciona" className={styles.secondaryButton}>
              Como funciona
            </a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
          <div className={styles.heroCircle}></div>
        </div>
      </section>

      {/* HOW — Approach Section */}
      <section className={styles.howSection} id="como-funciona">
        <div className={styles.howContent}>
          <span className={styles.sectionLabel}>Como fazemos isso</span>
          <h2 className={styles.sectionTitle}>
            Tecnologia a serviço das comunidades
          </h2>
          <p className={styles.sectionSubtitle}>
            Automatizamos o trabalho chato para que você só precise aproveitar
            as melhores ofertas da sua região.
          </p>
          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>📲</div>
              <h3 className={styles.pillarTitle}>Monitoramos por você</h3>
              <p className={styles.pillarText}>
                Acompanhamos continuamente os maiores e melhores grupos de
                compras coletivas de Florianópolis no WhatsApp e extraímos
                cada oferta publicada — em tempo real.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>🗂️</div>
              <h3 className={styles.pillarTitle}>Organizamos as melhores ofertas</h3>
              <p className={styles.pillarText}>
                As promoções são categorizadas e exibidas de forma clara para
                que você encontre o que precisa sem vasculhar mensagens em
                vários grupos.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIcon}>🚪</div>
              <h3 className={styles.pillarTitle}>Entrega na sua porta</h3>
              <p className={styles.pillarText}>
                Adicione ao carrinho, efetue o pagamento e aguarde. Cuidamos
                da logística e entregamos direto na sua casa em
                Florianópolis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT — MVP Deliverables */}
      <section className={styles.features}>
        <span className={styles.sectionLabel}>O que entregamos</span>
        <h2 className={styles.sectionTitle}>Dois produtos, uma missão</h2>
        <p className={styles.sectionSubtitle}>
          Começamos simples e focado no que realmente gera valor para as
          comunidades.
        </p>
        <div className={styles.mvpGrid}>
          <div className={styles.mvpCard}>
            <div className={styles.mvpBadge}>Entregável 1 — Disponível agora</div>
            <div className={styles.mvpIcon}>📲</div>
            <h3 className={styles.mvpTitle}>
              Agregador de Promoções do WhatsApp
            </h3>
            <p className={styles.mvpText}>
              Coletamos automaticamente as promoções publicadas nos principais
              grupos de compras coletivas do WhatsApp e as exibimos em uma
              plataforma organizada, com filtros por categoria, região e faixa
              de preço.
            </p>
            <ul className={styles.mvpList}>
              <li>Monitoramento contínuo dos grupos</li>
              <li>Categorização automática por produto</li>
              <li>Filtro por cidade e estado</li>
              <li>Alertas para novas ofertas</li>
            </ul>
          </div>
          <div className={styles.mvpCard}>
            <div className={`${styles.mvpBadge} ${styles.mvpBadgeSecondary}`}>
              Entregável 2 — Em breve
            </div>
            <div className={styles.mvpIcon}>🗂️</div>
            <h3 className={styles.mvpTitle}>Catálogo para Administradores</h3>
            <p className={styles.mvpText}>
              Painel completo para que líderes comunitários criem catálogos
              próprios, gerenciem pedidos coletivos e coordenem as entregas da
              sua comunidade com simplicidade.
            </p>
            <ul className={styles.mvpList}>
              <li>Criação e edição de catálogos</li>
              <li>Consolidação de pedidos dos membros</li>
              <li>Painel de gestão de entregas</li>
              <li>Relatórios de economia gerada</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scraped Offers Section */}
      <section className={styles.offersSection} id="ofertas">
        <div className={styles.offersContent}>
          <span className={styles.sectionLabelLight}>Ao vivo</span>
          <h2 className={styles.offersSectionTitle}>
            Promoções coletadas dos grupos do WhatsApp
          </h2>
          <p className={styles.offersSectionSubtitle}>
            Ofertas reais publicadas hoje nos grupos de compras coletivas
            monitorados pela CoopEra.
          </p>
          <div className={styles.offersGrid}>
            {scrapedOffers.map((offer) => (
              <div
                key={offer.id}
                className={`${styles.offerCard} ${offer.isNew ? styles.offerCardNew : ""}`}
              >
                {offer.isNew && (
                  <span className={styles.offerNewBadge}>Novo</span>
                )}
                <div className={styles.offerSource}>
                  <span className={styles.offerSourceIcon}>💬</span>
                  <span className={styles.offerSourceName}>
                    {offer.sourceGroup}
                  </span>
                </div>
                <div className={styles.offerCategoryRow}>
                  <span className={styles.offerCategory}>
                    {categoryEmoji[offer.category] ?? "🛒"} {offer.category}
                  </span>
                  <span className={styles.offerTime}>{offer.postedAt}</span>
                </div>
                <h3 className={styles.offerTitle}>{offer.title}</h3>
                <p className={styles.offerDescription}>{offer.description}</p>
                <div className={styles.offerPriceRow}>
                  <div className={styles.offerPrices}>
                    {offer.originalPrice && (
                      <span className={styles.offerOriginalPrice}>
                        {offer.originalPrice}
                      </span>
                    )}
                    <span className={styles.offerPrice}>{offer.price}</span>
                    <span className={styles.offerUnit}>/ {offer.unit}</span>
                  </div>
                </div>
                <div className={styles.offerFooter}>
                  <span className={styles.offerLocation}>
                    📍 {offer.location}
                  </span>
                  {offer.minOrder && (
                    <span className={styles.offerMinOrder}>
                      {offer.minOrder}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — Steps */}
      <section className={styles.steps}>
        <div className={styles.stepsContent}>
          <span className={styles.sectionLabel}>Passo a passo</span>
          <h2 className={styles.sectionTitle}>Como funciona na prática</h2>
          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>1</div>
              <div>
                <h3 className={styles.stepTitle}>
                  CoopEra monitora os melhores grupos de Floripa
                </h3>
                <p className={styles.stepDescription}>
                  Monitoramos constantemente os maiores grupos de compras
                  coletivas do WhatsApp em Florianópolis e extraímos as
                  promoções publicadas automaticamente.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>2</div>
              <div>
                <h3 className={styles.stepTitle}>
                  Adicione os produtos ao carrinho e pague
                </h3>
                <p className={styles.stepDescription}>
                  Navegue pelas ofertas organizadas, escolha o que precisa,
                  adicione ao carrinho e conclua o pagamento direto na
                  plataforma — sem precisar entrar em nenhum grupo.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>3</div>
              <div>
                <h3 className={styles.stepTitle}>
                  Aguarde os produtos chegarem na sua casa
                </h3>
                <p className={styles.stepDescription}>
                  Cuidamos de toda a logística. Seus produtos chegam direto
                  na sua porta em Florianópolis, sem você precisar sair de
                  casa para buscar nada.
                </p>
              </div>
            </div>
          </div>
          <div className={styles.stepHighlight}>
            <span className={styles.stepHighlightText}>
              Economize até 30% comprando junto com sua comunidade
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
              Monitoramos os melhores grupos de compras coletivas do WhatsApp
              de Florianópolis e reunimos as ofertas em um só lugar para você
              comprar e receber em casa.
            </p>
          </div>

          <div className={styles.crowdfunding}>
            <h4 className={styles.crowdfundingTitle}>
              🚀 Ajude a Construir o CoopEra
            </h4>
            <p className={styles.crowdfundingText}>
              Este projeto nasceu da proximidade com líderes comunitários que
              conhecem a dificuldade de acompanhar dezenas de grupos no
              WhatsApp e não perder as melhores ofertas. Estamos construindo
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
