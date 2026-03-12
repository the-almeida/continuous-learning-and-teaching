describe("Mini Marketplace — E2E", () => {
  beforeEach(() => {
    // Clear localStorage state before each test
    cy.clearLocalStorage();
  });

  it("displays product listing on home page", () => {
    cy.visit("/");
    cy.get("h1").contains("Products").should("be.visible");
    cy.get("article").should("have.length.greaterThan", 0);
  });

  it("search filter narrows product list", () => {
    cy.visit("/");
    cy.get("#search-input").type("Headphones");
    cy.wait(500); // debounce
    cy.get("article").should("have.length.lessThan", 5);
    cy.get("article").first().contains("Headphones");
  });

  it("category filter works", () => {
    cy.visit("/");
    cy.get("#category-select").select("Books");
    cy.url().should("include", "category=Books");
    cy.get("article").each(($el) => {
      cy.wrap($el).contains("Books");
    });
  });

  it("navigates to product detail page", () => {
    cy.visit("/");
    cy.contains("button", /add to cart/i)
      .parents("article")
      .find("a")
      .first()
      .click();
    cy.url().should("match", /\/products\/.+/);
    cy.get("h1").should("be.visible");
    cy.get("button")
      .contains(/add to cart/i)
      .should("be.visible");
  });

  it("login → add to cart → place order flow", () => {
    // 1. Login
    cy.visit("/auth/login");
    cy.get("#email").type("customer@marketplace.com");
    cy.get("#password").type("Customer123!");
    cy.get('button[type="submit"]').click();

    // 2. Should redirect to home after login
    cy.url().should("eq", Cypress.config().baseUrl + "/");

    // 3. Add first available product to cart
    cy.contains("article button", /add to cart/i).click();

    // 4. Go to cart
    cy.get("a[aria-label]").contains("").click(); // cart icon
    cy.visit("/cart");
    cy.get("li").should("have.length.greaterThan", 0);

    // 5. Place order
    cy.get("button")
      .contains(/place order/i)
      .click();

    // 6. Redirected to orders page
    cy.url().should("include", "/orders");
    cy.get("h1").contains("My Orders").should("be.visible");
    cy.get("li").should("have.length.greaterThan", 0);
  });
});
