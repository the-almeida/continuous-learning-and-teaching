import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductsService } from '../products/products.service';
import { Role } from '../common/enums/role.enum';

const mockUser = { id: 'user-1', email: 'test@test.com', role: Role.Customer };
const mockProduct = { id: 'prod-1', name: 'Product', price: 10.00, stock: 5 };

describe('OrdersService', () => {
  let service: OrdersService;
  let productsService: jest.Mocked<ProductsService>;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: ProductsService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    productsService = module.get(ProductsService);
  });

  describe('create', () => {
    it('should create an order and deduct stock', async () => {
      const product = { ...mockProduct };
      productsService.findOne.mockResolvedValue(product as any);
      mockManager.create.mockImplementation((_, data) => data);
      mockManager.save.mockImplementation(async (entity) => entity);

      await service.create({ items: [{ productId: 'prod-1', quantity: 2 }] }, mockUser as any);

      expect(mockManager.save).toHaveBeenCalled();
      expect(product.stock).toBe(3);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      productsService.findOne.mockResolvedValue({ ...mockProduct, stock: 1 } as any);

      await expect(
        service.create({ items: [{ productId: 'prod-1', quantity: 5 }] }, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate total amount correctly', async () => {
      productsService.findOne.mockResolvedValue({ ...mockProduct } as any);
      mockManager.create.mockImplementation((_, data) => data);

      let savedOrder: any;
      mockManager.save.mockImplementation(async (entity) => {
        if (entity.userId) savedOrder = entity;
        return entity;
      });

      await service.create({ items: [{ productId: 'prod-1', quantity: 3 }] }, mockUser as any);
      expect(savedOrder.totalAmount).toBe(30);
    });
  });
});
