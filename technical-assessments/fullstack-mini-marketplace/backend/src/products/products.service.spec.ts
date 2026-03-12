import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { Product } from "./product.entity";

const mockProduct = {
  id: "uuid-1",
  name: "Test Product",
  description: "Test description",
  price: 29.99,
  category: "Electronics",
  stock: 10,
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockQueryBuilder = {
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(1),
  getMany: jest.fn().mockResolvedValue([mockProduct]),
};

describe("ProductsService", () => {
  let service: ProductsService;
  let repo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
  });

  describe("findAll", () => {
    it("should return paginated products", async () => {
      const result = await service.findAll({ page: 1, limit: 12 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should calculate correct pagination", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(25);
      const result = await service.findAll({ page: 2, limit: 10 });
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      repo.findOne.mockResolvedValue(mockProduct);
      const result = await service.findOne("uuid-1");
      expect(result.name).toBe("Test Product");
    });

    it("should throw NotFoundException when product not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a product", async () => {
      repo.create.mockReturnValue(mockProduct);
      repo.save.mockResolvedValue(mockProduct);
      const result = await service.create({
        name: "Test Product",
        price: 29.99,
        category: "Electronics",
        stock: 10,
      });
      expect(result.name).toBe("Test Product");
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      repo.findOne.mockResolvedValue({ ...mockProduct });
      repo.save.mockResolvedValue({ ...mockProduct, name: "Updated" });
      const result = await service.update("uuid-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });
});
