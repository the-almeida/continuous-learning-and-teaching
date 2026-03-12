import { AppDataSource } from "./data-source";
import * as bcrypt from "bcrypt";

const products = [
  // Electronics (16)
  {
    name: "Wireless Headphones",
    description: "Premium noise-cancelling headphones",
    price: 149.99,
    category: "Electronics",
    stock: 50,
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  },
  {
    name: "Mechanical Keyboard",
    description: "RGB mechanical keyboard with blue switches",
    price: 89.99,
    category: "Electronics",
    stock: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
  },
  {
    name: "USB-C Hub",
    description: "7-in-1 USB-C hub with HDMI and SD card reader",
    price: 39.99,
    category: "Electronics",
    stock: 100,
    imageUrl:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400",
  },
  {
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with long battery life",
    price: 29.99,
    category: "Electronics",
    stock: 75,
    imageUrl:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
  },
  {
    name: "4K Monitor",
    description: "27-inch 4K IPS monitor with 144Hz refresh rate",
    price: 399.99,
    category: "Electronics",
    stock: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
  },
  {
    name: "Webcam HD",
    description: "1080p webcam with built-in microphone and autofocus",
    price: 69.99,
    category: "Electronics",
    stock: 60,
    imageUrl:
      "https://images.unsplash.com/photo-1617802690658-1173a812650d?w=400",
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable waterproof Bluetooth speaker with 20h battery",
    price: 59.99,
    category: "Electronics",
    stock: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400",
  },
  {
    name: "Smart Watch",
    description: "Fitness tracker with heart rate monitor and GPS",
    price: 199.99,
    category: "Electronics",
    stock: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
  },
  {
    name: "Laptop Stand",
    description: "Adjustable aluminum laptop stand for ergonomic use",
    price: 34.99,
    category: "Electronics",
    stock: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400",
  },
  {
    name: "External SSD",
    description: "1TB portable NVMe SSD with USB 3.2 Gen 2",
    price: 109.99,
    category: "Electronics",
    stock: 55,
    imageUrl:
      "https://images.unsplash.com/photo-1597673030470-87f51a6f2e7e?w=400",
  },
  {
    name: "Noise-Cancelling Earbuds",
    description: "True wireless earbuds with ANC and 30h total playtime",
    price: 129.99,
    category: "Electronics",
    stock: 65,
    imageUrl:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400",
  },
  {
    name: "Gaming Controller",
    description: "Wireless controller compatible with PC and consoles",
    price: 49.99,
    category: "Electronics",
    stock: 85,
    imageUrl:
      "https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=400",
  },
  {
    name: "Ring Light",
    description: "18-inch LED ring light with tripod for streaming and photos",
    price: 44.99,
    category: "Electronics",
    stock: 70,
    imageUrl:
      "https://images.unsplash.com/photo-1609743522471-83c84ce23e32?w=400",
  },
  {
    name: "Desk Lamp",
    description: "LED desk lamp with wireless charging pad and USB port",
    price: 54.99,
    category: "Electronics",
    stock: 95,
    imageUrl:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400",
  },
  {
    name: "Cable Management Kit",
    description: "Velcro cable ties and sleeves for a clean desk setup",
    price: 14.99,
    category: "Electronics",
    stock: 200,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
  },
  {
    name: "Power Bank 20000mAh",
    description: "Fast-charge 20000mAh power bank with dual USB-C output",
    price: 49.99,
    category: "Electronics",
    stock: 110,
    imageUrl:
      "https://images.unsplash.com/photo-1609592806596-4b1739e64e2a?w=400",
  },

  // Clothing (14)
  {
    name: "Cotton T-Shirt",
    description: "Comfortable 100% organic cotton t-shirt",
    price: 24.99,
    category: "Clothing",
    stock: 200,
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
  },
  {
    name: "Denim Jeans",
    description: "Classic slim-fit denim jeans",
    price: 59.99,
    category: "Clothing",
    stock: 150,
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
  },
  {
    name: "Running Shoes",
    description: "Lightweight running shoes with cushioned sole",
    price: 79.99,
    category: "Clothing",
    stock: 80,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  },
  {
    name: "Hoodie",
    description: "Warm fleece hoodie with kangaroo pocket",
    price: 44.99,
    category: "Clothing",
    stock: 175,
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400",
  },
  {
    name: "Chino Pants",
    description: "Slim-fit stretch chino pants, wrinkle-resistant",
    price: 49.99,
    category: "Clothing",
    stock: 130,
    imageUrl:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400",
  },
  {
    name: "Polo Shirt",
    description: "Classic piqué polo shirt in multiple colors",
    price: 34.99,
    category: "Clothing",
    stock: 160,
    imageUrl:
      "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400",
  },
  {
    name: "Winter Jacket",
    description: "Water-resistant insulated puffer jacket",
    price: 119.99,
    category: "Clothing",
    stock: 60,
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  },
  {
    name: "Ankle Boots",
    description: "Leather ankle boots with side zipper",
    price: 89.99,
    category: "Clothing",
    stock: 70,
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
  },
  {
    name: "Baseball Cap",
    description: "Adjustable structured baseball cap with embroidered logo",
    price: 19.99,
    category: "Clothing",
    stock: 220,
    imageUrl:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
  },
  {
    name: "Wool Sweater",
    description: "Merino wool crewneck sweater, soft and breathable",
    price: 74.99,
    category: "Clothing",
    stock: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
  },
  {
    name: "Yoga Pants",
    description: "High-waist compression yoga pants with side pockets",
    price: 39.99,
    category: "Clothing",
    stock: 140,
    imageUrl:
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400",
  },
  {
    name: "Leather Belt",
    description: "Genuine leather belt with classic buckle, 35mm width",
    price: 29.99,
    category: "Clothing",
    stock: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400",
  },
  {
    name: "Swim Trunks",
    description: "Quick-dry swim trunks with mesh lining and zip pocket",
    price: 27.99,
    category: "Clothing",
    stock: 115,
    imageUrl:
      "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400",
  },
  {
    name: "Dress Socks (5-pack)",
    description: "Premium cotton dress socks in assorted colors",
    price: 17.99,
    category: "Clothing",
    stock: 300,
    imageUrl:
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400",
  },

  // Books (12)
  {
    name: "Clean Code",
    description:
      "A handbook of agile software craftsmanship by Robert C. Martin",
    price: 34.99,
    category: "Books",
    stock: 60,
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
  },
  {
    name: "The Pragmatic Programmer",
    description: "From journeyman to master - classic programming book",
    price: 39.99,
    category: "Books",
    stock: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400",
  },
  {
    name: "Design Patterns",
    description: "Elements of reusable object-oriented software",
    price: 44.99,
    category: "Books",
    stock: 35,
    imageUrl:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
  },
  {
    name: "You Don't Know JS",
    description: "Deep dive into the JavaScript language core mechanisms",
    price: 29.99,
    category: "Books",
    stock: 80,
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400",
  },
  {
    name: "Refactoring",
    description: "Improving the design of existing code by Martin Fowler",
    price: 42.99,
    category: "Books",
    stock: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  },
  {
    name: "The Phoenix Project",
    description: "A novel about IT, DevOps, and helping your business win",
    price: 27.99,
    category: "Books",
    stock: 55,
    imageUrl:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400",
  },
  {
    name: "Domain-Driven Design",
    description: "Tackling complexity in the heart of software by Eric Evans",
    price: 49.99,
    category: "Books",
    stock: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400",
  },
  {
    name: "System Design Interview",
    description: "An insider's guide to system design interviews, Vol. 1",
    price: 32.99,
    category: "Books",
    stock: 70,
    imageUrl:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
  },
  {
    name: "Designing Data-Intensive Applications",
    description:
      "The big ideas behind reliable, scalable, and maintainable systems",
    price: 54.99,
    category: "Books",
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=400",
  },
  {
    name: "The Art of Unit Testing",
    description: "Learn to write maintainable, readable, and trustworthy tests",
    price: 36.99,
    category: "Books",
    stock: 50,
    imageUrl:
      "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=400",
  },
  {
    name: "Atomic Habits",
    description:
      "An easy and proven way to build good habits and break bad ones",
    price: 22.99,
    category: "Books",
    stock: 120,
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
  },
  {
    name: "Deep Work",
    description:
      "Rules for focused success in a distracted world by Cal Newport",
    price: 21.99,
    category: "Books",
    stock: 100,
    imageUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400",
  },

  // Home & Office (8)
  {
    name: "Ergonomic Chair",
    description: "Adjustable lumbar support office chair with armrests",
    price: 249.99,
    category: "Home & Office",
    stock: 15,
    imageUrl:
      "https://images.unsplash.com/photo-1589384267710-7a170981ca78?w=400",
  },
  {
    name: "Standing Desk Converter",
    description: "Height-adjustable sit-stand desk converter, 32-inch surface",
    price: 179.99,
    category: "Home & Office",
    stock: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1593642533144-3d62aa4783ec?w=400",
  },
  {
    name: "Whiteboard",
    description: "Magnetic dry-erase whiteboard 36x24 inches with markers",
    price: 39.99,
    category: "Home & Office",
    stock: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400",
  },
  {
    name: "Desk Organizer",
    description: "Bamboo desktop organizer with drawer and pen holder",
    price: 29.99,
    category: "Home & Office",
    stock: 80,
    imageUrl:
      "https://images.unsplash.com/photo-1593642531955-b62e17bdaa9c?w=400",
  },
  {
    name: "Noise Machine",
    description:
      "White noise machine with 30 soothing sounds for sleep and focus",
    price: 44.99,
    category: "Home & Office",
    stock: 55,
    imageUrl:
      "https://images.unsplash.com/photo-1614094082869-cd4e4b2905c7?w=400",
  },
  {
    name: "Coffee Mug Warmer",
    description:
      "Electric mug warmer with auto shut-off, keeps drinks at 131°F",
    price: 19.99,
    category: "Home & Office",
    stock: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
  },
  {
    name: "Planner Notebook",
    description:
      "Weekly/monthly planner with goal-setting and habit tracker pages",
    price: 18.99,
    category: "Home & Office",
    stock: 200,
    imageUrl:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400",
  },
  {
    name: "Air Purifier",
    description: "HEPA air purifier for rooms up to 360 sq ft, ultra-quiet",
    price: 89.99,
    category: "Home & Office",
    stock: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400",
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log("Seeding database...");

  const userRepo = AppDataSource.getRepository("users");
  const productRepo = AppDataSource.getRepository("products");

  // Create admin
  const adminExists = await userRepo.findOne({
    where: { email: "admin@marketplace.com" },
  });
  if (!adminExists) {
    await userRepo.save({
      email: "admin@marketplace.com",
      password: await bcrypt.hash("Admin123!", 10),
      role: "admin",
    });
    console.log("Admin user created: admin@marketplace.com / Admin123!");
  }

  // Create customer
  const customerExists = await userRepo.findOne({
    where: { email: "customer@marketplace.com" },
  });
  if (!customerExists) {
    await userRepo.save({
      email: "customer@marketplace.com",
      password: await bcrypt.hash("Customer123!", 10),
      role: "customer",
    });
    console.log(
      "Customer user created: customer@marketplace.com / Customer123!",
    );
  }

  // Create products
  const existingCount = await productRepo.count();
  if (existingCount === 0) {
    await productRepo.save(products);
    console.log(`Created ${products.length} products`);
  }

  await AppDataSource.destroy();
  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
