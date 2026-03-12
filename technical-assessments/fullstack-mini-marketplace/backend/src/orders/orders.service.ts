import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Order } from "./order.entity";
import { OrderItem } from "./order-item.entity";
import { ProductsService } from "../products/products.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { User } from "../users/user.entity";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, user: User): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      const items: OrderItem[] = [];

      for (const itemDto of dto.items) {
        const product = await this.productsService.findOne(itemDto.productId);

        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product: ${product.name}`,
          );
        }

        const orderItem = manager.create(OrderItem, {
          productId: product.id,
          quantity: itemDto.quantity,
          unitPrice: product.price,
        });
        items.push(orderItem);
        totalAmount += Number(product.price) * itemDto.quantity;

        product.stock -= itemDto.quantity;
        await manager.save(product);
      }

      const order = manager.create(Order, {
        userId: user.id,
        totalAmount,
        items,
      });

      return manager.save(order);
    });
  }

  async findUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId },
      relations: ["items", "items.product"],
      order: { createdAt: "DESC" },
    });
  }
}
