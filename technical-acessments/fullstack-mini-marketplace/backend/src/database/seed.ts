import { AppDataSource } from './data-source';
import * as bcrypt from 'bcrypt';

const products = [
  { name: 'Wireless Headphones', description: 'Premium noise-cancelling headphones', price: 149.99, category: 'Electronics', stock: 50, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with blue switches', price: 89.99, category: 'Electronics', stock: 30, imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400' },
  { name: 'USB-C Hub', description: '7-in-1 USB-C hub with HDMI and SD card reader', price: 39.99, category: 'Electronics', stock: 100, imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400' },
  { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with long battery life', price: 29.99, category: 'Electronics', stock: 75, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400' },
  { name: 'Cotton T-Shirt', description: 'Comfortable 100% organic cotton t-shirt', price: 24.99, category: 'Clothing', stock: 200, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
  { name: 'Denim Jeans', description: 'Classic slim-fit denim jeans', price: 59.99, category: 'Clothing', stock: 150, imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
  { name: 'Running Shoes', description: 'Lightweight running shoes with cushioned sole', price: 79.99, category: 'Clothing', stock: 80, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { name: 'Clean Code', description: 'A handbook of agile software craftsmanship by Robert C. Martin', price: 34.99, category: 'Books', stock: 60, imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400' },
  { name: 'The Pragmatic Programmer', description: 'From journeyman to master - classic programming book', price: 39.99, category: 'Books', stock: 45, imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400' },
  { name: 'Design Patterns', description: 'Elements of reusable object-oriented software', price: 44.99, category: 'Books', stock: 35, imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400' },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Seeding database...');

  const userRepo = AppDataSource.getRepository('users');
  const productRepo = AppDataSource.getRepository('products');

  // Create admin
  const adminExists = await userRepo.findOne({ where: { email: 'admin@marketplace.com' } });
  if (!adminExists) {
    await userRepo.save({
      email: 'admin@marketplace.com',
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
    });
    console.log('Admin user created: admin@marketplace.com / Admin123!');
  }

  // Create customer
  const customerExists = await userRepo.findOne({ where: { email: 'customer@marketplace.com' } });
  if (!customerExists) {
    await userRepo.save({
      email: 'customer@marketplace.com',
      password: await bcrypt.hash('Customer123!', 10),
      role: 'customer',
    });
    console.log('Customer user created: customer@marketplace.com / Customer123!');
  }

  // Create products
  const existingCount = await productRepo.count();
  if (existingCount === 0) {
    await productRepo.save(products);
    console.log(`Created ${products.length} products`);
  }

  await AppDataSource.destroy();
  console.log('Seeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
